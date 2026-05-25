const express = require("express");
const { body } = require("express-validator");
const {
  getAllRaffles,
  getRaffleById,
  createRaffle,
  updateRaffle,
  deleteRaffle,
  getDashboardStats,
  pauseRaffle,
  unpauseRaffle,
  getPauseInfo,
  toggleAutoPause,
  publishRaffle,
  getPublishRaffles,
  getFirstActiveRaffleDetails
} = require("../controllers/raffleController");
const authenticateToken = require("../middleware/auth");
const {
  upload,
  uploadRaffleFiles,
  handleMulterError,
} = require("../config/multer");

const router = express.Router();

// Rutas públicas
router.get("/", getAllRaffles);
router.get("/first-active", getFirstActiveRaffleDetails);
router.get("/:id", getRaffleById);
router.get("/:id/pause-info", getPauseInfo);

// Rutas protegidas
router.get("/admin/dashboard", authenticateToken, getDashboardStats);
router.post(
  "/",
  authenticateToken,
  uploadRaffleFiles,
  handleMulterError,
  [
    body("name").notEmpty().withMessage("Nombre requerido"),
    body("total_tickets")
      .isInt({ min: 1 })
      .withMessage("Cantidad de boletos debe ser mayor a 0"),
    body("price_bs")
      .isFloat({ min: 0 })
      .withMessage("Precio en Bs debe ser mayor o igual a 0"),
    body("price_usd")
      .isFloat({ min: 0 })
      .withMessage("Precio en USD debe ser mayor o igual a 0"),
  ],
  createRaffle
);
router.put(
  "/:id",
  authenticateToken,
  uploadRaffleFiles,
  handleMulterError,
  updateRaffle
);
router.put("/:id/publish/", authenticateToken, publishRaffle);
router.get("/publish/all", getPublishRaffles);

router.post("/:id/pause", authenticateToken, pauseRaffle);
router.post("/:id/unpause", authenticateToken, unpauseRaffle);
router.put("/:id/auto-pause", authenticateToken, toggleAutoPause);
router.delete("/:id", authenticateToken, deleteRaffle);

module.exports = router;
