
const verifyAdmin = (req, res, next)=>{
    const email = req.params.email
    const decodedEmail = req.decoded.email;
    const role = req.decoded.role;

    if(email === decodedEmail && role === 'admin'){
        return next()
    }else{
        res.status(403).send({message: 'Forbidden'})
    }
}

module.exports = verifyAdmin;