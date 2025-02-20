// routes/cartRoutes.js
import express from "express";
import { checkout, getOrders } from "../controller/order.js"
import { addToCart, deleteFromCart, getCart } from "../controller/cart.js";

const router = express.Router();

router.post("/add", addToCart);
router.post("/delete", deleteFromCart);
router.get("/", getCart);
router.post("/checkout", checkout); 
router.get("/orders", getOrders);

export default router;