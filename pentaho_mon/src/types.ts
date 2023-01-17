export type ressource ={
    name:string;
    comment:string;
    type:string;
    agent:string;
    value:string
}
export type application ={
    application:string;
}
export type endpoint={
	name:string;
	endpoint:string;
	status:string
}
export type BwySvc ={
    "?xml":string;
    SCR_Svc_ServiceManager_getNodes_OUTPUT:{
        SCR_WRK_TABLE_services:{
            SCR_WRK_TABLE_services:{
                    NAME:string;
                    STATUSONOFF:string;
                    TOPROCESS:string;
                    INOROUT:string;
                    NODE:string;
            }[]
        }
    }
}