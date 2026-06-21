import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const provisionSchema = z.object({
    full_name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    department: z.string().optional().nullable(),
    role: z.enum([
        'admin', 
        'super_admin',
        'recruiter_interviewer', 
        'recruiter_s', 
        'recruiter_a', 
        'recruiter_jc', 
        'recruiter_sy', 
        'ops_validator'
    ]),
    avatar_data: z.string().optional().nullable(),
});
