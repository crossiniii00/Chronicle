import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { MhrtService } from '../services/MhrtService.js';
import { MhrtRepository } from '../repositories/MhrtRepository.js';

export const mhrtRouter = Router();

// --- 1. Master Accounts ---

mhrtRouter.get('/accounts', requireAuth, async (req, res, next) => {
    try {
        const departmentFilter = (req.user && req.user.role !== 'admin') ? req.user.department : null;
        const accounts = await MhrtRepository.findAllAccounts(departmentFilter);
        res.json(accounts);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.post('/accounts', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const account = await MhrtService.createAccount(req.body);
        res.status(201).json(account);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.patch('/accounts/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const account = await MhrtService.updateAccount(req.params.id, req.body);
        if (!account) return res.status(400).json({ error: 'No fields provided' });
        res.json(account);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.delete('/accounts/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        await MhrtRepository.deleteAccount(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// --- 2. H2R Records ---

mhrtRouter.get('/h2r', requireAuth, async (req, res, next) => {
    try {
        const departmentFilter = (req.user && req.user.role !== 'admin') ? req.user.department : null;
        const h2r = await MhrtRepository.findAllH2R(departmentFilter);
        res.json(h2r);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.post('/h2r', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const h2r = await MhrtService.createH2R(req.body);
        res.status(201).json(h2r);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.patch('/h2r/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const h2r = await MhrtService.updateH2R(req.params.id, req.body);
        if (!h2r) return res.status(400).json({ error: 'No fields provided' });
        res.json(h2r);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.delete('/h2r/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        await MhrtRepository.deleteH2R(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// --- 3. Division Mappings ---

mhrtRouter.get('/divisions', requireAuth, async (_req, res, next) => {
    try {
        const divisions = await MhrtRepository.findAllDivisions();
        res.json(divisions);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.post('/divisions', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const division = await MhrtService.createDivision(req.body);
        res.status(201).json(division);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.patch('/divisions/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const division = await MhrtService.updateDivision(req.params.id, req.body);
        if (!division) return res.status(400).json({ error: 'No fields provided' });
        res.json(division);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.delete('/divisions/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        await MhrtRepository.deleteDivision(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// --- 4. Time Off Assignments ---

mhrtRouter.get('/time-off', requireAuth, async (_req, res, next) => {
    try {
        const timeOff = await MhrtRepository.findAllTimeOff();
        res.json(timeOff);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.post('/time-off', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const timeOff = await MhrtService.createTimeOff(req.body);
        res.status(201).json(timeOff);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.patch('/time-off/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const timeOff = await MhrtService.updateTimeOff(req.params.id, req.body);
        if (!timeOff) return res.status(400).json({ error: 'No fields provided' });
        res.json(timeOff);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.delete('/time-off/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        await MhrtRepository.deleteTimeOff(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// --- 5. Directory ---

mhrtRouter.get('/directory', requireAuth, async (req, res, next) => {
    try {
        const departmentFilter = (req.user && req.user.role !== 'admin') ? req.user.department : null;
        const directory = await MhrtRepository.findAllDirectory(departmentFilter);
        res.json(directory);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.post('/directory', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const entry = await MhrtService.createDirectory(req.body);
        res.status(201).json(entry);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.patch('/directory/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const entry = await MhrtService.updateDirectory(req.params.id, req.body);
        if (!entry) return res.status(400).json({ error: 'No fields provided' });
        res.json(entry);
    } catch (error) {
        next(error);
    }
});

mhrtRouter.delete('/directory/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        await MhrtRepository.deleteDirectory(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});
