import {validationResult,body} from 'express-validator';

const validate = (req,res,next)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({message:errors.array()[0].msg})
    }
    next();
}

const registerValidation = [
    body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({min:3,max:20})
    .withMessage('Username must be between 3 and 20 characters'),
    body('email')
    .isEmail()
    .withMessage("valid email is required"),
    body('password')
    .isLength({min:6})
    .withMessage('Password must be at least 6 characters long'),
    validate
]

const loginValidation = [
    body('email')
    .isEmail()  
    .withMessage("valid email is required"),
    body('password')
    .isLength({min:6})
    .withMessage('Password must be at least 6 characters long'),
    validate
]

export const Validation = {
    registerValidation,
    loginValidation
}