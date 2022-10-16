
const createError = require('http-errors');

exports.profile = (req, res, next) => {
    const user = req.user;

    user.name = req.body.name;
    user.about = req.body.about;
    user.avatar = req.file ? req.file.filename : user.avatar;
    user.save()
        .then(updated => {
            sendUpdateUser(updated);
            res.json();
        })
        .catch(next);
};


const sendUpdateUser = (user) => {
    io.emit('update_user', user.getData());
};


exports.password = (req, res, next) => {

    const { password, newPassword } = req.body;
    let user = req.user;

    if (!user.checkPassword(password)) {
        return next(createError(401, "كلمة المرور خاطئة"));
    }

    user.password = newPassword;
    user.save().then(updated => res.json())
        .catch(next);
};

