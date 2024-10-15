import { asyncHandler } from "../utils/asynchandler.js"
import { ApiError } from "../utils/Apierror.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


const generateAccessTokenAndRefreshToken = async (userId) => {
    try {

        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        //    generateRefreshToken & generateAccessToken are methods so '()' are used

        user.refreshToken = refreshToken
        // the following thing is false because whenever we use save the schema matches the structure that is will match that all fields like password ,email etc are valid/present or not here we dont want that as it is of no need
        await user.save({ validateBeforeSave: false })



        return { accessToken, refreshToken }
    }
    catch {
        throw new ApiError("500", "something went wrong while generating token")
    }
}



const registerUser = asyncHandler(async (req, res) => {

    // [1] get user details from frontend
    // [2] validation
    // [3]  check if user already exist
    // [4]  check for images,check for avatar
    // [5]  upload them to cloudinary,avatar
    // [6]  create user object - create entry in DB
    // [7]  remove password & refresh token field from response
    // [8]  check for user creation
    // [9]  return res



    //[1]  get user details from frontend

    // the inner element should be same as we defined in user.modal
    const { fullname, email, username, password } = req.body

    console.log(req.body);



    // [2]  validation


    // method-1

    // do the following for each data 
    // if(fullname===""){
    //     throw new ApiError(400,"fullname is required")
    // }

    // method 2

    if (
        [fullname, email, username, password].some((field) => {
            field?.trim() === ""
        })
    ) {
        throw new ApiError(400, "All fields are required")

    }

    // [3] check if user already exist

    // findone method used find the string of all user name available in Userschema,or used if any of them is found similarly you can use comment,text etc

    // findone return the first entry which it get
    const existeduser = await User.findOne({
        $or: [{ username }, { email }],

    })

    if (existeduser) {
        throw new ApiError(409, "username/email already  exists")
    }

    // takeing the file path from multer
    // since tbefore running this code the request has passed the multer which have changed r=the response(that is what a middleware do therefore we can access files here),just remember this thing
    const avatarLocalPath = req.files?.avatar[0]?.path

    //  following can be problamatic because it is a js error
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    //  by the following print we can get what you want
    console.log(req.files);



    //  [4]  check for images,check for avatar given by user or not

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")

    }

    //  [5] upload them to cloudinary,avatar

    //  await because uploadOnCloudinary may take time ,uploadon cloudnary function created in utils folder
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverimage = await uploadOnCloudinary(coverImageLocalPath)



    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")

    }

    // [6]  create user object - create entry in DB

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverimage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })



    // [7]    remove password & refresh token field from response 

    const createduser = await User.findById(user._id).select(
        // - represent removal
        "-password -refreshToken"
    )
    // [8]  check for user creation

    if (!createduser) {
        throw new ApiError(500, "Something went wrong whille registering the user")
    }
    // [9] return res

    return res.status(201).json(
        new Apiresponse(200, createduser, "User registered successfully")
    )

})





// LOGIN CONTROLLER

const loginUser = asyncHandler(async (req, res) => {

    // req body ->data
    // find the user
    // password check
    // access and refresh token
    // send cookie



    // [1] get the input(eiter username or email)

    const { username, email, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    // [2] find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User doesn,t Exist")
    }


    //    [3] checking the password

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalis user credentials")
    }

    //   [4]
    // token generator function defined above (after import) 
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)




    const loggedInuser = await User.findById(user._id).select("-password-refreshToken")

    // [5]
    
    const options = {
        
        //     httpOnly: true: This means the cookie cannot be accessed or modified by client-side JavaScript. It helps mitigate certain kinds of cross-site scripting (XSS) attacks.
        httpOnly: true,
        // secure: true: This ensures the cookie is only sent over HTTPS, providing an additional layer of security by encrypting the data during transmission.
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new Apiresponse(200, {
                user, loggedInuser, accessToken,
                refreshToken
            },
                "User Logged in successfully"


            ))
})

const logOutUser = asyncHandler(async (req, res) => {

    // desiging our own middleware

    console.log(req.user
    );

    // user jab logout kar raha hai tab ham log uska refresh token delete/undefine karwa rhe hai aur jab user login karega to vo do no token fir se generate ho sakte hai


    await User.findByIdAndUpdate(
        req.user._id,

        {
            $unset: {
                refreshToken: 1 //this removes the field from document
            }

        }
    )

    const options = {
        // httponly true means modifiable only by server
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new Apiresponse(200, {}, "User logged Out"))

})




// new accesstoken  generator using refreshtoken

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incommingrefreshToken = req.cookies.refreshToken || req.body.refreshToken


    if (!incommingrefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    let decodedtoken;

    try {

        decodedtoken = jwt.verify(
            incommingrefreshToken, process.env.REFRESH_TOKEN_SECRET
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid Refresh Token")

    }

    const user = await User.findById(decodedtoken?._id)

    if (!user) {
        throw new ApiError(401, "Invalid refresh token")
    }

    if (incommingrefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh Token is Expired")
    }

    const options = {

        httpOnly: true,
        secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new Apiresponse(
                200,
                { accessToken, refreshToken: newRefreshToken }
            ))
})



















// WRITING UPDATE CONTROLLER



const changeCurrentPassword = asyncHandler(async (req, res) => {


    const { oldPassword, newPassword } = req.body


    // this middleware runs after the auth middleware so the request has user
    const user = await User.findById(req?.user._id)

    // ispasswordCorrect is a method made in usermodel to verify a string with bcrtpted password 
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")

    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(
            new Apiresponse(200, {}, "Password changed Successfully")
        )



})

//  this middleware runs after the auth middleware so the request has user
const getCurrentUser = asyncHandler(async (req, res) => {

    return res.status(200).json(200, req.user, "current user fetched successfully")


})




// if you want to update a file make another controller [production level thing]

const updateAccountdetails = asyncHandler(async (req, res) => {

    const { fullname, email } = req.body

    console.log(req.user?._id);


    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }


    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            // set etc are 
            $set: {
                fullname,//fullname : fullname (not written in ES6 Js)
                email: email,

            }

        },
        { new: true }
    ).select("-password") //we dont want password field

    console.log(user);

    if (!user) {
        throw new ApiError(400, "Can't process now")
    }


    return res.status(200)
        .json(
            new Apiresponse(200, user, "Account details updated Successfully")
        )

})

const updateUseravatar = asyncHandler(async (req, res) => {

    // we get files from passing the req through multer middleware here file is taken as 1 only file required

    const avatarLocalPath = req.file?.path

    const oldavatarLocalPath = req.user.avatar


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file not found")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)


    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }





    if (!deletestatus) {
        throw new ApiError(402, "The image can't be deleted from the server now,try again later")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        }
        , { new: true }
    ).select("-password")

    const deletestatus = await deleteOnCloudinary(oldavatarLocalPath)

    console.log(deletestatus)


    return res.status(200).json(
        new Apiresponse(200, user, "Avataar updated Successfully")
    )


})
const updateUserCoverImage = asyncHandler(async (req, res) => {

    // we get files from passing the req through multer middleware -> (upload) here file is taken as 1 only file required

    const coverImageLocalPath = req.file?.path

    console.log(req.file);
    console.log(req.file?.path);


    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar file not found")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on CoverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        }
        , { new: true }
    ).select("-password")



    return res.status(200).json(
        new Apiresponse(200, user, "CoverImage updated Successfully")
    )



})


// video 17 & 18 are important to understand the following coide

const getUserChannelProfile = asyncHandler(async (req, res) => {


    // we get the username from url

    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    //   method 1
    //   User.find({username})

    // method-2
    // channel will be an array as aggregate return an array

    const channel = await User.aggregate([

        // stage 1 we selected our id
        {
            $match: {
                username: username?.toLowerCase()
            },

        },
        // stage 2,we find that id in subscription schema'channel which also contains user,so we get total subscribers,basically channel constains all user which have id

        {
            // lookup perform left outer join the field to out 1st incomming selected documents
            $lookup: {
                // Actually Subscripton schema but in DB its name is subscriptions
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        // stage 3,we find that id in subscription schema'subscribers which also contains user,so we get total channels,
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"

            }
        },
        // stage 4,finally adding the new fields to output documents and getting the count
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false

                    }
                }
            }
        },
        {
            // project will give only selected things and 1 means pass
            $project: {
                fullname: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
            }
        }


    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel doesn,t exists")
    }


    console.log(channel)

    return res.status(200).json(
        new Apiresponse(200, channel[0], "User channel fetched successfully")
    )


})


// vid 20

const getWatchHistory = asyncHandler(async (req, res) => {

    //   interview question when we search req.user._id this id is the struing but in mongodb we get _id  = objectid("wbavbaubuvbeaububv") ,so we get the string and do our operation with that string and mongoose handles it on its own.

    const user = await User.aggregate([
        {
            $match: {
                //   the thing that we discussed above is not workable here bcoz the code of aggregate goes to mongodb directly not through mongoose so we converted our id to objectId in following way
                _id: new mongoose.Types.ObjectId(req.user._id)
            }

        }, {
            $lookup: {
                // Actually Video schema but in DB its name is videos
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                // our subpipeline this is used with other $
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    // the above pipeline gets an array and we want to get only first element
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    if (!user) {
        throw new ApiError(401, "Can't get the watchhistory")
    }

    return res.status(200).json(
        new Apiresponse(200, user[0].watchHistory, "WatchHistory fetched succesfully ")
    )



})












export {
    registerUser, loginUser, logOutUser,
    refreshAccessToken, changeCurrentPassword, getCurrentUser,
    updateAccountdetails, updateUseravatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory
}