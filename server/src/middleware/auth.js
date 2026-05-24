const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ message: "No autorizado: falta token Bearer" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, email }
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "No autorizado: token inválido o expirado" });
  }
}

module.exports = auth;
