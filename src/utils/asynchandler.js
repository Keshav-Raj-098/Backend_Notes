// we have taken fn as a parameter of asynchandler
// const x = ()=>{}
// const x = ()=>{()=>{}} same as const x = () => ()=>{} 



// way 1

// const asyncHandler =(fn)=>async(req,res,next)=>{

//     try {
//         await fn(req,res,next)
        
//     } catch (error) {


//         res.status(err.code || 500).json({
//             success:false,
//             message: err.message
//         })
        
//     }

// }


// export {asyncHandler}



// way 2

const asyncHandler = (requesthandler)=>{
    return (req,res,next)=>{
        Promise
        .resolve(requesthandler(req,res,next))
        .catch((err)=>{next(err)})
    }
}

export {asyncHandler}