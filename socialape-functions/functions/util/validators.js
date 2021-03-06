const isEmpty = (string) => {
    if (string.trim() === '') return true;
    else return false;
};
const isEmail = (string) => {
    var emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (string.match(emailRegEx)) return true;
    else return false;
};

exports.validateSignUpData = (data) => {
    let errors = {};

    if (isEmpty(data.email)) {
        errors.email = "Must not be empty";
    } else if (!isEmail(data.email)) {
        errors.email = "Email is not valid";
    }

    if (isEmpty(data.password)) {
        errors.password = "Must not be empty";
    }
    if (isEmpty(data.confirmPassword) && data.password !== data.confirmPassword) {
        errors.confirmPassword = "Passwords must match";
    }
    if (isEmpty(data.handle)) {
        errors.handle = "Must not be empty";
    }

    return {
        errors,
        valid : Object.keys(errors).length === 0? true : false
    }
}

exports.validateLoginData = (data) => {
    let errors = {};

    if (isEmpty(data.email)) {
        errors.email = "Must not be empty";
    } else if (!isEmail(data.email)) {
        errors.email = "Email is not valid";
    }

    if (isEmpty(data.password)) {
        errors.password = "Must not be empty";
    }

    return {
        errors,
        valid : Object.keys(errors).length === 0 ? true : false
    }

}

exports.reduceUserDetails = (data) => {
    let userDetails = {};

    if(!isEmpty(data.bio.trim())) userDetails.bio = data.bio.trim();
    if(!isEmpty(data.website.trim())){
        if(data.website.trim().substring(0,4) !== 'http') {
            userDetails.website = `http://${data.website.trim()}`;
        }else userDetails.website = data.website.trim();
    }
    if(!isEmpty(data.location.trim())) userDetails.location = data.location.trim();

    return userDetails;
}