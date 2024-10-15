class ApiError extends Error{
    constructor(statuscode,message="Something Went Wrong",errors = [],statck = "")
        
        {

            super(message)
            this.statusCode=statuscode  
            this.data = null
            this.message = message
            this.success = false;
            this.errors = errors

            if(statck){

                this.stack = this.statck
                }else{
                            Error.captureStackTrace(this,this.constructor)
                        }
        }

    
}

export {ApiError}