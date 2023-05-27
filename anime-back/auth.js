const jwt=require('jsonwebtoken')

exports.auth = async (req, res, next) => {

    if (
        req.headers.authorization &&
        req.headers.authorization.split(" ")[0] === "Bearer"
      ) {
          console.log(req.headers.authorization.split(" ")[1])
          try{
          var decoded = jwt.verify(req.headers.authorization.split(" ")[1], 'testserverkey');

          //ako treba i da je admin
          // if(decoded.is_admin==="false"){
          //   return res.status(403).send({
          //     msg: 'Authentication is denied.',
          // })}
          if(!decoded){
            return res.status(403).send({
              msg: 'Authentication is denied.',
          })
          }
          
          console.log(decoded.is_admin)
          }catch(err){
            console.log(err)
          }
          next()
      }else{
        return res.status(403).send({
            msg: 'Authentication is denied.',
        })
      }
}

