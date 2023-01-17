 
//Request SQL
export const pentaho_query_hourly = `
WITH 
latest_exec as (SELECT  CD_INTERFACE , max(DT_SUIVI_DEB) latest_exec_date FROM ref_tech_suivi_interface GROUP BY CD_INTERFACE),
interface_list AS (SELECT CD_INTERFACE FROM latest_exec WHERE latest_exec_date > sysdate - 15 ),
interface_x_hour AS (SELECT DISTINCT column_value  AS HOUR, CD_INTERFACE FROM  table(sys.odcinumberlist(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23)) CROSS JOIN interface_list),
hour_stats AS(
	SELECT 
		past.CD_INTERFACE ,
		EXTRACT (YEAR FROM past.dt_suivi_deb) year,
		EXTRACT (MONTH FROM past.dt_suivi_deb) month,
		EXTRACT (DAY FROM past.dt_suivi_deb) day,
		EXTRACT (hour FROM past.dt_suivi_deb) HOUR,
		count(id_suivi) run,
		count(CASE WHEN CD_STATUT = 'ERREUR' THEN 1 END)run_error
	FROM ref_tech_suivi_interface past
	WHERE past.dt_suivi_deb >= add_months( trunc(sysdate), -12 ) -- recuperation des sample sur annee glissant
		AND CD_INTERFACE IN (SELECT * FROM interface_list) -- interface ayant tournee au moins une fois depuis 1 mois, pour exclure les interface obsoletes
	GROUP BY past.CD_INTERFACE ,
		EXTRACT (YEAR FROM past.dt_suivi_deb) ,
		EXTRACT (MONTH FROM past.dt_suivi_deb) ,
		EXTRACT (DAY FROM past.dt_suivi_deb) ,
		EXTRACT (hour FROM past.dt_suivi_deb) 
	ORDER BY YEAR desc,MONTH desc,DAY desc,HOUR DESC
),
past as(
SELECT hour_stats.CD_INTERFACE ,
	hour_stats.HOUR,
	sum(hour_stats.run) sample_size,
	round(avg(hour_stats.run)) avg_hourly_runs
FROM hour_stats 
GROUP BY hour_stats.CD_INTERFACE
	,hour_stats.HOUR
),
present AS (
SELECT hour_stats.CD_INTERFACE ,
	hour_stats.DAY,
	hour_stats.HOUR,
	hour_stats.run,
 	hour_stats.run_error
FROM hour_stats 
WHERE  hour_stats.DAY= EXTRACT (DAY FROM current_date) 
	AND hour_stats.MONTH = EXTRACT (MONTH FROM current_date) 
	AND hour_stats.YEAR = EXTRACT (YEAR FROM current_date)
), merged AS (
SELECT interface_x_hour.cd_interface, 
	interface_x_hour.HOUR,
	past.avg_hourly_runs,
	present.run ,
	CASE
		WHEN past.HOUR > EXTRACT (HOUR FROM LOCALTIMESTAMP) THEN ' '
		WHEN past.HOUR < EXTRACT (HOUR FROM LOCALTIMESTAMP) AND  present.run IS NULL THEN 'Did not run'
		WHEN past.HOUR <= EXTRACT (HOUR FROM LOCALTIMESTAMP) AND present.run_error >0 THEN 'ERROR'
		WHEN past.HOUR = EXTRACT (HOUR FROM LOCALTIMESTAMP) AND past.avg_hourly_runs IS NOT NULL AND present.run IS NOT NULL THEN 'Running'
		WHEN past.HOUR = EXTRACT (HOUR FROM LOCALTIMESTAMP) AND past.avg_hourly_runs IS NOT NULL AND present.run IS  NULL THEN 'Waiting'
		WHEN past.HOUR <= EXTRACT (HOUR FROM LOCALTIMESTAMP) AND ((present.run) - (past.avg_hourly_runs)) >= -2 THEN 'OK'
		--WHEN past.HOUR <= EXTRACT (HOUR FROM LOCALTIMESTAMP) AND ((present.run) - (past.avg_hourly_runs)) < -2 THEN 'Less than usual'
		WHEN present.run >0 AND present.run_error = 0 THEN 'Out of schedule'
		WHEN present.run >0 AND present.run_error > 0 THEN 'ERROR - Out of schedule'
	END AS status 
FROM interface_x_hour 
	LEFT JOIN past 
		ON past.CD_INTERFACE = interface_x_hour.CD_INTERFACE
		AND past.HOUR = interface_x_hour.HOUR 
		AND past.sample_size > 50 --ON prend en compte les jobs qui existent depuis au moins x executions
	LEFT JOIN present 
		ON interface_x_hour.CD_INTERFACE = present.cd_interface 
		AND interface_x_hour.HOUR = present.HOUR
ORDER BY interface_x_hour.cd_interface,
	interface_x_hour.HOUR
),
interface_score AS (
SELECT 
interface_x_hour.cd_interface, 
	CASE
		WHEN past.HOUR < EXTRACT (HOUR FROM LOCALTIMESTAMP) AND  present.run IS NULL THEN 0
		WHEN past.HOUR <= EXTRACT (HOUR FROM LOCALTIMESTAMP) AND present.run_error >0 THEN 2
		WHEN past.HOUR = EXTRACT (HOUR FROM LOCALTIMESTAMP) AND past.avg_hourly_runs IS NOT NULL AND present.run IS NOT NULL THEN 6
		WHEN past.HOUR = EXTRACT (HOUR FROM LOCALTIMESTAMP) AND past.avg_hourly_runs IS NOT NULL AND present.run IS  NULL THEN 5
		WHEN past.HOUR <= EXTRACT (HOUR FROM LOCALTIMESTAMP) AND ((present.run) - (past.avg_hourly_runs)) >= -2 THEN 7
		WHEN past.HOUR <= EXTRACT (HOUR FROM LOCALTIMESTAMP) AND ((present.run) - (past.avg_hourly_runs)) < -2 THEN 4
		WHEN present.run >0 AND present.run_error = 0 THEN 3
		WHEN present.run >0 AND present.run_error > 0 THEN 1
		ELSE 999
	END AS  score
	FROM interface_x_hour 
	LEFT JOIN past 
		ON past.CD_INTERFACE = interface_x_hour.CD_INTERFACE
		AND past.HOUR = interface_x_hour.HOUR 
		AND past.sample_size > 50 --ON prend en compte les jobs qui existent depuis au moins x executions
	LEFT JOIN present 
		ON interface_x_hour.CD_INTERFACE = present.cd_interface 
		AND interface_x_hour.HOUR = present.HOUR
)
--SELECT * FROM merged;
SELECT pivot_tab.CD_INTERFACE,min(SCORE) AS score,"0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23"
FROM merged pivot ( 
	max( CASE WHEN run IS NOT NULL OR avg_hourly_runs IS NOT NULL THEN   nvl(run,0)||'/'||nvl(avg_hourly_runs,0)||' ' ||status ELSE '-' END) 
	FOR HOUR IN (0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23) 
) pivot_tab LEFT JOIN interface_score
	ON interface_score.CD_INTERFACE = pivot_tab.CD_INTERFACE
GROUP BY pivot_tab.CD_INTERFACE,"0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23"
ORDER BY CD_INTERFACE
`
export const pentaho_query_daily = `
WITH 
latest_exec as (SELECT  CD_INTERFACE , max(DT_SUIVI_DEB) latest_exec_date FROM ref_tech_suivi_interface GROUP BY CD_INTERFACE),
latest_exec_24h_status AS (SELECT past.CD_INTERFACE , past.CD_STATUT  FROM ref_tech_suivi_interface past  
	INNER JOIN latest_exec 
		ON latest_exec.CD_INTERFACE = past.CD_INTERFACE 
		AND latest_exec.latest_exec_date= past.DT_SUIVI_DEB  
	WHERE latest_exec_date >SYSDATE -1),
AGG AS (
	SELECT CD_INTERFACE, CD_STATUT , metier
	FROM latest_exec_24h_status
	INNER JOIN METIER_X_INTERFACE met
		ON met.INTERFACE = latest_exec_24h_status.CD_INTERFACE)
SELECT * FROM AGG
PIVOT (COUNT(CD_INTERFACE) value FOR CD_STATUT IN ('ERREUR','SUCCESS','STARTED')) ORDER BY METIER
`

export const blueway_query_service=`
select * from (
    select
        s.application_out application,
        s.BUSINESS_OBJECT,
        mo.service_name service_name,
        count(distinct(case when mo.EVT_ID is not null and mo.event_type='ERR_TECH' then mo.MSG_ID else NULL end)) AS NB_KO,
        count(distinct(case when mo.EVT_ID is null then mo.MSG_ID else NULL end)) AS NB_OK
    from par_service s
    inner join par_business_object bo on bo.BUSINESS_OBJECT=s.BUSINESS_OBJECT
    left join(
        select m.service_name, m.ID as MSG_ID, e.ID as EVT_ID,m.CREATED_AT,e.event_type,e.description,m.pivot_id
        from BKP_MESSAGE_OUT m 
        left join event e on e.BKP_OUT_ID=m.ID
        )mo on mo.service_name = s.service_name
    left join(
        select m.service_name, m.ID as MSG_ID, e.ID as EVT_ID,m.CREATED_AT,e.event_type,e.description,m.in_id
        from BKP_MESSAGE_PIVOT m 
        left join event e on e.BKP_PIVOT_ID=m.ID
        )mp on mp.MSG_ID = mo.PIVOT_ID 
    left join(
        select m.service_name, m.ID as MSG_ID, e.ID as EVT_ID,m.CREATED_AT,e.event_type,e.description
        from BKP_MESSAGE_IN m 
        left join event e on e.BKP_IN_ID=m.ID 
        )mi on mi.MSG_ID = mp.in_id
    where mi.CREATED_AT >sysdate-1
    group by s.BUSINESS_OBJECT,s.application_out,mo.service_name
    having        
        count(distinct(case when mo.EVT_ID is not null and mo.event_type='ERR_TECH' then mo.MSG_ID else NULL end))>0
UNION -----------------------------------------
    select
        s.application_in application,
        s.BUSINESS_OBJECT,
        mi.service_name service_name,
        count(distinct(case when mi.EVT_ID is not null and mi.event_type='ERR_TECH' then mi.MSG_ID else NULL end)) +
        count(distinct(case when mp.EVT_ID is not null and mp.event_type='ERR_TECH' then mp.MSG_ID else NULL end)) AS NB_KO,
        count(distinct(case when mi.EVT_ID is null then mi.MSG_ID else NULL end)) +
        count(distinct(case when mp.EVT_ID is null then mp.MSG_ID else NULL end)) AS NB_OK
    from par_service s
    inner join par_business_object bo on bo.BUSINESS_OBJECT=s.BUSINESS_OBJECT
    left join(
        select m.service_name, m.ID as MSG_ID, e.ID as EVT_ID,m.CREATED_AT,e.event_type,e.description
        from BKP_MESSAGE_IN m 
        left join event e on e.BKP_IN_ID=m.ID 
        )mi on mi.service_name = s.service_name
    left join(
        select m.service_name, m.ID as MSG_ID, e.ID as EVT_ID,m.CREATED_AT,e.event_type,e.description,m.in_id
        from BKP_MESSAGE_PIVOT m 
        left join event e on e.BKP_PIVOT_ID=m.ID
        )mp on mp.in_id = mi.MSG_ID 
    where mi.CREATED_AT >sysdate-1
    group by s.BUSINESS_OBJECT,s.application_in,mi.service_name
    having         
        count(distinct(case when mi.EVT_ID is not null and mi.event_type='ERR_TECH' then mi.MSG_ID else NULL end)) +
        count(distinct(case when mp.EVT_ID is not null and mp.event_type='ERR_TECH' then mp.MSG_ID else NULL end)) > 0
) 
order by business_object, application, service_name, nb_ok
`