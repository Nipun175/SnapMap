const bcrypt = require("bcryptjs")
const { validationResult } = require("express-validator")
const jwt = require("jsonwebtoken")

const User = require("../models/user");
const HttpError = require("../models/http-error");


const getUsers = async (req, res, next) => {
    let users;
    try {
        users = await User.find({}, '-password');
    } catch(err) {
        return next(new HttpError("Something went wrong fetching users", 500));
    }

    if(!users){
        return next(new HttpError("No users Found", 404));
    }

    return res.status(200).json({ users: users.map(user => user.toObject({ getters: true })) });
}

const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return next(new HttpError("Invalid inputs passed, please check your data", 422));
    }

    const { name, email, password } = req.body;

    let user;

    try {
        user = await User.findOne({ email: email });
    } catch(err) {
        return next(new HttpError("Something went wrong fetching user data", 500));
    }

    if(user){
        return next(new HttpError("E-mail already exists", 422));
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        return next(new HttpError('Could not create user, please try again', 500));
    }

    const createdUser = new User({
        name,
        email,
        password: hashedPassword,
        image: req.file.path.replace("\\","/"),
        places: []
    });

    try {
        await createdUser.save();
    } catch(err) {
        return next(new HttpError("A problem occured while signing in, try again later", 500));
    }

    let token;
    try {
        token = jwt.sign({
                userId: createdUser.id, email: createdUser.email
            }, 
            process.env.JWT_KEY,
            {expiresIn: "1h"}
        );
        
        // console.log(token);
    } catch (err) {
        return next(new HttpError("A problem occured while signing in, try again later", 500));
    }

    res.status(201).json({ userId: createdUser.id, email: createdUser.email, token: token});
}

const login = async (req, res, next) => {
    const { email, password } = req.body;
    let user;

    try {
        user = await User.findOne({ email: email });
    } catch (err) {
        return next(new HttpError("Something went wrong fetching user credentials", 500));
    }

    if(!user){
        return next(new HttpError("Invalid Credentials, could not login", 404));
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, user.password);
    } catch (err) {
        return next(new HttpError("Could not log you in, please check your credentials and try again"), 500);
    } 

    if (!isValidPassword) {
        return next(new HttpError("Invalid Credentials, could not login", 404));
    }

    let token;
    try {
        token = jwt.sign({
                userId: user.id, email: user.email
            }, 
            process.env.JWT_KEY,
            { expiresIn: "1h" }
        );
        // console.log(token);
    } catch (err) {
        return next(new HttpError("A problem occured while signing in, try again later", 500));
    }

    return res.status(200).json({
        userId: user.id,
        email: user.email,
        token: token
    });
}

module.exports = { getUsers, signup, login}
