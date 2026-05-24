const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); // FIX: usar bcryptjs (igual que authController)
const User = require("../models/User");

// FIX: importar el middleware existente en vez de duplicarlo
const authMiddleware = require("../middleware/auth");

// GET /api/profile - Obtener perfil del usuario autenticado
router.get("/", authMiddleware, async (req, res) => {
  try {
    // FIX: el token guarda req.user.userId, no req.user.id ni req.user._id
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      fullName: user.fullName || "",
      phone: user.phone || "",
      profilePicture: user.profilePicture || ""
    });
  } catch (error) {
    res.status(500).json({ message: "Error al recuperar perfil: " + error.message });
  }
});

// PUT /api/profile - Actualizar nombre, teléfono y foto de perfil
router.put("/", authMiddleware, async (req, res) => {
  try {
    // FIX: usar req.user.userId
    const userId = req.user.userId;
    const { fullName, name, phone, profilePicture } = req.body;

    if (!name) {
      return res.status(400).json({ message: "El nombre de usuario es obligatorio" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    user.name = name;
    user.fullName = fullName;
    user.phone = phone;
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }

    await user.save();

    res.json({
      message: "Perfil actualizado correctamente",
      id: user._id,
      name: user.name,
      email: user.email,
      fullName: user.fullName || "",
      phone: user.phone || "",
      profilePicture: user.profilePicture || ""
    });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar perfil: " + error.message });
  }
});

// PUT /api/profile/password - Cambiar contraseña validando la actual
router.put("/password", authMiddleware, async (req, res) => {
  try {
    // FIX: usar req.user.userId
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Se requieren la contraseña actual y la nueva contraseña" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "La contraseña actual es incorrecta" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;

    await user.save();

    res.json({ message: "Contraseña actualizada exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar la contraseña: " + error.message });
  }
});

module.exports = router;