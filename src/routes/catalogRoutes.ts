import { Router } from "express";
import type { Pool } from "pg";
import { CatalogController } from "../controller/CatalogController.js";
import { CatalogModel } from "../model/CatalogModel.js";

export function createCatalogRouter(pool: Pool): Router {
  const router = Router();
  const controller = new CatalogController(new CatalogModel(pool));

  router.get("/products", controller.listProducts);
  router.get("/products/:id", controller.getProduct);
  router.get("/categories", controller.listCategories);
  router.get("/brands", controller.listBrands);

  return router;
}