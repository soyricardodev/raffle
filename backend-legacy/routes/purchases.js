const express = require("express");
const { body } = require("express-validator");
const {
  createPurchase,
  getAllPurchases,
  getClientPurchases,
  updatePurchaseStatus,
  getPurchaseById,
  addTicketsToPurchase,
  reassignTicketsToPurchase,
  removeTicketsFromPurchase,
  getAnalyticsPurchases,
} = require("../controllers/purchaseController");
const authenticateToken = require("../middleware/auth");
const { upload, handleMulterError } = require("../config/multer");

const router = express.Router();

// Rutas públicas
router.post(
  "/",
  upload.single("payment_proof"),
  handleMulterError,
  [
    body("raffle_id").isInt().withMessage("ID de rifa requerido"),
    body("customer_name").notEmpty().withMessage("Nombre requerido"),
    body("customer_phone").notEmpty().withMessage("Teléfono requerido"),
    body("payment_method")
      .isIn(["zinli", "zelle", "binance", "bs", "usd", "pago_movil"])
      .withMessage("Método de pago no válido"),
    body("ticket_quantity")
      .isInt({ min: 1 })
      .withMessage("Cantidad de boletos debe ser mayor a 0"),
  ],
  createPurchase
);
router.get("/top-clients", getClientPurchases);

// Rutas protegidas
router.get("/", authenticateToken, getAllPurchases);
router.get("/client-purchases", authenticateToken, getClientPurchases);
router.get("/analytics", authenticateToken, getAnalyticsPurchases);
router.get("/:id", authenticateToken, getPurchaseById);
router.put("/:id/status", authenticateToken, updatePurchaseStatus);
router.put(
  "/:id/tickets/add",
  authenticateToken,
  [
    body("quantity")
      .isInt({ min: 1, max: 50000 })
      .withMessage("La cantidad debe ser un entero entre 1 y 50,000"),
  ],
  addTicketsToPurchase
);
router.put(
  "/:id/tickets/reassign",
  authenticateToken,
  reassignTicketsToPurchase
);

router.put(
  "/:id/tickets/remove",
  authenticateToken,
  [
    body("quantity")
      .isInt({ min: 1, max: 50000 })
      .withMessage("La cantidad debe ser un entero entre 1 y 50,000"),
  ],
  removeTicketsFromPurchase
);

module.exports = router;
