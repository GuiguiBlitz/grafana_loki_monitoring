import oracledb from 'oracledb';
import log4js from 'log4js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import * as https from 'https';
import fetch from 'node-fetch';
import { parse } from 'csv-parse';
import * as getStream from 'get-stream';
import { XMLParser } from 'fast-xml-parser';
import * as queries from "./queries.js";
const logger = log4js.getLogger();
logger.level = "info";
dotenv.config({ path: '.env.prod' });
function cleanUpServer(eventType) {
    logger.info("Stopping service :" + eventType);
    logger.info("Bye bye ☹️");
    process.exit(0);
}
[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
    process.on(eventType, cleanUpServer.bind(null, eventType));
});
async function selectFromPentaho(sql) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: process.env.PENTAHO_USER,
            password: process.env.PENTAHO_PASS,
            connectionString: process.env.PENTAHO_CON
        });
        const result = await connection.execute(sql, [], { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rs = result.resultSet;
        let row;
        const resultData = [];
        while ((row = await rs.getRow())) {
            resultData.push(row);
        }
        await rs.close();
        return resultData;
    }
    catch (err) {
        logger.error("Error lors de la connection a la base BIA 😟");
        logger.error(err);
    }
    finally {
        if (connection) {
            try {
                await connection.close();
            }
            catch (err) {
                logger.error("Error lors de la connection a la base BIA 😟");
                logger.error(err);
            }
        }
    }
}
async function selectFromBlueway(sql) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: process.env.BLUEWAY_USER,
            password: process.env.BLUEWAY_PASS,
            connectionString: process.env.BLUEWAY_CON,
        });
        const result = await connection.execute(sql, [], { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rs = result.resultSet;
        let row;
        const resultData = [];
        while ((row = await rs.getRow())) {
            resultData.push(row);
        }
        await rs.close();
        return resultData;
    }
    catch (err) {
        logger.error("Error lors de la connection a la base ESB 😟");
        logger.error(err);
    }
    finally {
        if (connection) {
            try {
                await connection.close();
            }
            catch (err) {
                logger.error("Error lors de la connection a la base ESB 😟");
                logger.error(err);
            }
        }
    }
}
async function sleep_min(min) {
    return new Promise((resolve) => {
        setTimeout(resolve, min * 1000 * 60);
    });
}
async function getVtom(endpoint) {
    const httpsAgent = new https.Agent({
        keepAlive: true,
        rejectUnauthorized: false
    });
    const fetch_options = {
        method: 'GET',
        headers: { 'X-API-KEY': process.env.VTOM_API_KEY },
        agent: httpsAgent
    };
    try {
        const vtom_fetch = await fetch(process.env.VTOM_URL + endpoint, fetch_options);
        if (vtom_fetch.status == 200) {
            const data = await vtom_fetch.json();
            return data;
        }
        else {
            logger.error("error connection to Vtom API 😟");
            logger.error(vtom_fetch.json());
        }
    }
    catch (err) {
        logger.error("cannot connect to Vtom API 😟");
        logger.error(err);
    }
}
async function checkVtomRessources() {
    const ressources = await getVtom('resources');
    const out_data = [];
    for (const ressource of ressources) {
        if (ressource.type == 'Weight' && ressource.value == '0') {
            const data = {
                application: ressource.name.split('_').pop()
            };
            if (!out_data.find(app => app.application == data.application)) {
                out_data.push(data);
            }
        }
    }
    return out_data;
}
async function load_endpoints(path) {
    let endpoints = [];
    const headers = ['name', 'endpoint'];
    const parseStream = parse({
        delimiter: ';',
        columns: headers
    });
    endpoints = await getStream.array(fs.createReadStream(path, { encoding: 'utf-8' }).pipe(parseStream));
    return endpoints;
}
async function checkEndpoints() {
    const httpsAgent = new https.Agent({
        keepAlive: true,
        rejectUnauthorized: false
    });
    const fetch_options = {
        method: 'GET',
        agent: httpsAgent
    };
    const endpointList = await load_endpoints(process.env.ENDPOINTS_PATH);
    for (const endpoint of endpointList) {
        if (endpoint.endpoint.includes('https')) {
            try {
                const req = await fetch(endpoint.endpoint, fetch_options);
                endpoint.status = req.status.toString();
            }
            catch (err) {
                endpoint.status = 'KO';
                logger.error(err);
            }
        }
        else {
            try {
                const req = await fetch(endpoint.endpoint);
                endpoint.status = req.status.toString();
            }
            catch (err) {
                endpoint.status = 'KO';
                logger.error(err);
            }
        }
    }
    return endpointList;
}
async function getBlueway(searchparam) {
    const httpsAgent = new https.Agent({
        keepAlive: true,
        rejectUnauthorized: false
    });
    const fetch_options = {
        method: 'GET',
        agent: httpsAgent
    };
    try {
        const blueway_fetch = await fetch(process.env.BLUEWAY_API + '?' + searchparam, fetch_options);
        if (blueway_fetch.status == 200) {
            const data = await blueway_fetch.text();
            return data;
        }
        else {
            logger.error("error connection to Blueway API 😟");
            logger.error(blueway_fetch.text());
        }
    }
    catch (err) {
        logger.error("cannot connect to Blueway API 😟");
        logger.error(err);
    }
}
async function checkBluewaySvc() {
    const services = await getBlueway(new URLSearchParams({
        flowName: 'SCR_Svc_ServiceManager_getNodes',
        flowType: 'EAII',
        actionXML: 'launch',
        var_isService: '1'
    }));
    const parser = new XMLParser();
    const serv_obj = parser.parse(services);
    return serv_obj.SCR_Svc_ServiceManager_getNodes_OUTPUT.SCR_WRK_TABLE_services.SCR_WRK_TABLE_services;
}
async function array_to_file(array, path) {
    const out_filename = path + new Date().toDateString() + '.log';
    for (const item of array) {
        try {
            fs.appendFileSync(out_filename, JSON.stringify(item));
            fs.appendFileSync(out_filename, '\n');
        }
        catch (err) {
            logger.error("Impossible d'ecrire dans le dossier cible 😟 " + path);
        }
    }
}
async function refresh() {
    logger.info("Sending data💾");
    logger.info("Vue hourly pentaho eai");
    await array_to_file(await selectFromPentaho(queries.pentaho_query_hourly), process.env.OUT_PATH_HOURLY);
    logger.info("Vue daily pentaho eai");
    await array_to_file(await selectFromPentaho(queries.pentaho_query_daily), process.env.OUT_PATH_DAILY);
    logger.info("Vue daily services blueway");
    await array_to_file(await selectFromBlueway(queries.blueway_query_service), process.env.OUT_PATH_BLUEWAY_SERVICE);
    logger.info("Vue ressources applis VTom innactives");
    await array_to_file(await checkVtomRessources(), process.env.OUT_PATH_VTOM_RESSOURCES);
    logger.info("Vue etat des endpoints");
    await array_to_file(await checkEndpoints(), process.env.OUT_PATH_ENDPOINTS_STATUS);
    logger.info("Vue etat des services Blueway");
    await array_to_file(await checkBluewaySvc(), process.env.OUT_PATH_BLUEWAY_SERVICE_STATE);
    logger.info("sleep " + process.env.REFRESH_RATE_MINUTES + " minutes 😴 and recurse");
    await sleep_min(Number(process.env.REFRESH_RATE_MINUTES));
    refresh();
}
async function main() {
    logger.info("Starting service 😊 - test COUCOU");
    refresh();
}
main();
//# sourceMappingURL=pentaho_mon.js.map