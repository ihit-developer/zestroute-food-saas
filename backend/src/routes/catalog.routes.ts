import { Router } from 'express';
import { CatalogService } from '../services/catalog.service.js';

export const catalogRouter = Router();

catalogRouter.get('/home', async (req, res, next) => {
  try {
    const restaurantId =
      typeof req.query.restaurantId === 'string' && req.query.restaurantId.trim()
        ? req.query.restaurantId.trim()
        : undefined;
    const data = await CatalogService.getHomeFeed(restaurantId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/categories', async (_req, res, next) => {
  try {
    const data = await CatalogService.listCategories();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/restaurants', async (req, res, next) => {
  try {
    const result = await CatalogService.listRestaurants({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.status(200).json({ success: true, data: result.items, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/restaurants/:id', async (req, res, next) => {
  try {
    const data = await CatalogService.getRestaurantDetails(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/foods/:id', async (req, res, next) => {
  try {
    const data = await CatalogService.getFoodDetails(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});
