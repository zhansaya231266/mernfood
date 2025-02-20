import Order from "../models/order.js";
import Cart from "../models/cart.js";

export const checkQueryPerformance = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Вы не авторизованы" });
        }

        const userId = req.session.user._id;

        const noIndexExplain = await Order.find({ userId }).explain("executionStats");
        const indexedExplain = await Order.find({ userId }).sort({ createdAt: -1 }).explain("executionStats");

        res.json({
            noIndex: {
                executionTimeMS: noIndexExplain.executionStats.executionTimeMillis,
                totalDocsExamined: noIndexExplain.executionStats.totalDocsExamined
            },
            withIndex: {
                executionTimeMS: indexedExplain.executionStats.executionTimeMillis,
                totalDocsExamined: indexedExplain.executionStats.totalDocsExamined
            }
        });
    } catch (error) {
        console.error("Ошибка анализа производительности:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};

export const userOrderStats = async (req, res) => {
    try {
        const stats = await Order.aggregate([
            { $group: { _id: "$userId", totalOrders: { $sum: 1 }, totalSpent: { $sum: "$totalPrice" } } },
            { $project: { userId: "$_id", totalOrders: 1, totalSpent: 1, _id: 0 } }
        ]);

        res.json({ success: true, stats });
    } catch (error) {
        console.error("Ошибка агрегации заказов по пользователям:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

export const dailySales = async (req, res) => {
    try {
        const sales = await Order.aggregate([
            { 
                $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
                    totalOrders: { $sum: 1 }, 
                    totalRevenue: { $sum: "$totalPrice" } 
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        res.json({ success: true, sales });
    } catch (error) {
        console.error("Ошибка агрегации продаж:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

export const checkout = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Вы не авторизованы" });
        }

        const userId = req.session.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.foodId");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Корзина пуста" });
        }

        const order = new Order({
            userId,
            items: cart.items,
            totalPrice: cart.totalPrice,
        });

        await order.save();
        await Cart.deleteOne({ userId });

        res.json({ success: true, message: "Заказ успешно оформлен", order });
    } catch (error) {
        console.error("Ошибка при оформлении заказа:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};

export const getOrders = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Вы не авторизованы" });
        }

        const userId = req.session.user._id;
        const orders = await Order.find({ userId }).sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        console.error("Ошибка при получении заказов:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};

async function updateStatus(orderId) {
    const newStatus = document.getElementById(`status-select-${orderId}`).value;

    if (!["В обработке", "Доставляется", "Доставлен"].includes(newStatus)) {
        alert("Недопустимый статус!");
        return;
    }

    const response = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: newStatus })
    });

    const data = await response.json();
    if (data.success) {
        document.getElementById(`status-${orderId}`).innerText = newStatus;
        alert("Статус доставки обновлен!");
    } else {
        alert("Ошибка при обновлении статуса");
    }
}
