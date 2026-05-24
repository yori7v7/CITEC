const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const controller = require("../controllers/appointmentController");

router.use(auth);

router.post("/", controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
