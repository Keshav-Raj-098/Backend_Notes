import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});



const uploadOnCloudinary = async (localfilepath) => {


    try {

        if (!localfilepath) return null

        // upload the file on cloudinary
        const response = await cloudinary.uploader
            .upload(
                localfilepath,
                {
                    resource_type: "auto"
                }
            )
        //    file uploaded successfully

        fs.unlinkSync(localfilepath)
        // console.log(response.url);

        return response;

    } catch (error) {

        // remove the locally saved temperoary file as the operation get failed synchrouniously
        fs.unlinkSync(localfilepath)
        return null

    }
};


const deleteOnCloudinary =  async (localfilepath) => {

try {

          if(!localfilepath) return null;

          const response = await cloudinary.uploader.destroy(localfilepath,()=>{
            console.log("deleted from cloudinary");

            
          })

          console.log(response);
          
          return response;
         
      
    
} catch (error) {

    return error
    
}


}
export  { uploadOnCloudinary,deleteOnCloudinary }





