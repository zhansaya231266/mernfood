import express from "express";
import { isAdmin } from "../middlewares/isAdmin.js";
import Food from "../models/food.js";
import Order from "../models/order.js";

const router = express.Router();

router.get("/foods", isAdmin, async (req, res) => {
    try {
        const foods = await Food.find();
        res.render('admin/foods', { foods, user: req.session.user }); 
    } catch (error) {
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

router.get("/foods/new", isAdmin, (req, res) => {
    res.render("admin/newFood", {user: req.session.user});
});

router.post("/foods", isAdmin, async (req, res) => {
    try {
        const { name, variants, prices, category, image, description } = req.body;

        let parsedPrices;
        try {
            parsedPrices = JSON.parse(prices);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Неверный формат цен (prices)" });
        }

        const newFood = new Food({ 
            name, 
            variants: variants.split(','), 
            prices: parsedPrices, 
            category, 
            image, 
            description 
        });

        await newFood.save();
        res.redirect("/admin/foods");
    } catch (error) {
        console.error("Ошибка добавления товара:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});



router.get("/foods/:id/edit", isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const food = await Food.findById(id);
        res.render("admin/editFood", { food, user: req.session.user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

router.put("/foods/:id", isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, variants, prices, category, image, description } = req.body;
        const updatedFood = await Food.findByIdAndUpdate(id, { name, variants: variants.split(','), prices: JSON.parse(prices), category, image, description }, { new: true });
        res.redirect("/admin/foods");
    } catch (error) {
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

router.delete("/foods/:id", isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await Food.findByIdAndDelete(id);
        res.redirect("/admin/foods");
    } catch (error) {
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

router.get('/orders', isAdmin, async (req, res) => {
    try {
        const orders = await Order.find({}).populate('userId'); 
        res.render('admin/adminOrder', { 
            orders: orders,
            user: req.session.user 
        });
    } catch (error) {
        console.error("Ошибка при получении заказов:", error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

router.put('/orders/:orderId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Заказ не найден" });
        }

        order.orderStatus = status;
        await order.save();

        res.json({ success: true, message: "Статус заказа обновлён" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Ошибка при обновлении статуса" });
    }
});

router.delete('/orders/:orderId', isAdmin, async (req, res) => {
    try {
        console.log("Удаление заказа:", req.params.orderId); 
        const order = await Order.findByIdAndDelete(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Заказ не найден" });
        }
        res.json({ success: true, message: "Заказ удален" });
    } catch (error) {
        console.error("Ошибка при удалении заказа:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});


export default router;