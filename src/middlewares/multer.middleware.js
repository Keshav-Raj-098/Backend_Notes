import multer from "multer";



// cb is callback
// here for simplicity we are saving te files with original name but is not good practice, read multer documentation to update this thing later

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
     
        console.log(file.size);
        
      cb(null, file.originalname)
    }
  })
  
  export const upload = multer({ storage })