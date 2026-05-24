const Appointment = require("../models/Appointment");

// Crear cita
exports.create = async (req, res) => {
  try {
    const { service, date, notes } = req.body;

    if (!service || !date) {
      return res
        .status(400)
        .json({ message: "service y date son obligatorios" });
    }

    const appointment = await Appointment.create({
      user: req.user.userId,
      service,
      date,
      notes,
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creando la cita" });
  }
};

// Obtener todas mis citas
exports.getAll = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      user: req.user.userId,
    }).sort({ date: 1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo citas" });
  }
};

// Obtener una cita
exports.getOne = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!appointment) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo cita" });
  }
};

// Actualizar cita
exports.update = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      req.body,
      { new: true },
    );

    if (!appointment) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: "Error actualizando cita" });
  }
};

// Eliminar cita
exports.remove = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!appointment) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    res.json({ message: "Cita eliminada correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error eliminando cita" });
  }
};
