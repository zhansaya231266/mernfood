import mongoose from "mongoose";
import Cart from "../models/cart.js";

export const getCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Пожалуйста, войдите в аккаунт" });
        }

        const userId = req.session.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.foodId");

        if (!cart || cart.items.length === 0) {
            return res.json({ success: true, items: [], totalPrice: 0 });
        }

        res.json({ success: true, items: cart.items, totalPrice: cart.totalPrice });
    } catch (error) {
        console.error("Ошибка получения корзины:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};

export const addToCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Вы не вошли в аккаунт" });
        }

        const { items } = req.body;
        const userId = req.session.user._id;

        const bulkOps = items.map(item => ({
            updateOne: {
                filter: { userId },
                update: { $push: { items: item }, $inc: { totalPrice: item.price * item.quantity } },  //bulk push
                upsert: true
            }
        }));

        await Cart.bulkWrite(bulkOps);
        res.json({ success: true, message: "Товар добавлен в корзину", cart });
    } catch (error) {
        console.error("Ошибка при добавлении в корзину:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};

export const deleteFromCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Вы не авторизованы" });
        }

        const { itemIds } = req.body;
        const userId = req.session.user._id;

        await Cart.updateOne(
            { userId },
            { $pull: { items: { _id: { $in: itemIds } } } }  //bulk pull
        );

        res.json({ success: true, message: "Выбранные товары удалены" });
    } catch (error) {
        console.error("Ошибка bulk удаления:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};

