"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/api/pets", (req, res) => {
    res.json([{ id: 1, name: "Fluffy", type: "cat" }]);
});
app.get("/health", (req, res) => {
    res.sendStatus(200);
});
exports.default = app;
