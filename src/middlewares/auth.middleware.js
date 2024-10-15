import { ApiError } from "../utils/Apierror.js"
import { asyncHandler } from "../utils/asynchandler.js"
import jwt  from "jsonwebtoken"
import { User } from "../models/user.model.js"

// next used beacause a middleware
// in our following code res has no use so _ used , a production level thing
export const verifyjJWT = asyncHandler((req,_,next)=>{
 try {
     
   
       const token = req.cookies?.accessToken  || req.header("Authorization")?.replace("Bearer ","")
   
       // in postman in header section set authorization syntax is 
       // Authorization:Bearer<space><token>
   
   
       if (!token) {
           throw new ApiError(401,"Unauthorized Request")
           
       }
   
       const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
   
   
      const user = User.findById(decodedToken?._id).select(
           "-password-refreshToken"
       )
      
      //  console.log(user.path);
       
      if(!user){
       throw new ApiError(401,"Invalid Access Token")
      }
   
    //   so this just update the user fo req to new req here not in DB 
      req.user = user;
      next()
   
   
 } catch (error) {
    throw new ApiError(401,error?.message || "Invalid Access Token")
    
 }

})
