import dotenv from "dotenv"
import express from "express"
import connectDB from "./db/index.js"
import { app} from "./app.js"


dotenv.config({
  path:'./.env'
})

connectDB()
.then(()=>{
  app.listen(process.env.PORT || 4000,()=>{
    console.log(`server is running at : ${process.env.PORT}`);
    
  })
})
.catch((err)=>{console.log(err);
})

