import { Router } from "express";
import { registerUser,loginUser,logOutUser, refreshAccessToken, updateUseravatar, changeCurrentPassword, getCurrentUser, updateAccountdetails, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyjJWT } from "../middlewares/auth.middleware.js";

const router = Router();


router.route("/register").post(

    // 1st upload middleware run then registeruser and read about fileds by hovering over it
    upload.fields([
        {
            name:"avatar",
            maxCount:1

        },
        {
            name:"coverImage",
            maxCount:1

        }
    ]),
    registerUser

)

router.route("/login").post(loginUser)

// secured routes

// so 1st verifyjwt run then logouser middleware run 
router.route("/logout").post(verifyjJWT,logOutUser)
router.route("/refreshtoken").post(refreshAccessToken)
router.route("/changepassword").post(verifyjJWT,changeCurrentPassword)
router.route("/currentuser").get(verifyjJWT,getCurrentUser)
// patch used if post used then all details will be updated
router.route("/updateaccount").patch(verifyjJWT,updateAccountdetails)
router.route("/changeavatar").patch(verifyjJWT,upload.single("avatar"),updateUseravatar)

router.route("/changecoverimage")
.patch(verifyjJWT,upload.single("coverImage"),updateUserCoverImage)

// important we are taking the uesrname from params
router.route("/c/:username").get(verifyjJWT,getUserChannelProfile)
router.route("/history").get(verifyjJWT,getWatchHistory)




export default router;