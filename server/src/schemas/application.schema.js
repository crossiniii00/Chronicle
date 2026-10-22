import { z } from 'zod';

export const publicApplicationSchema = z.object({
    applicantName: z.string().optional().nullable(),
    applicantEmail: z.string().optional().nullable(),
    positionId: z.string().optional().nullable(),
    positionTitle: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    metadata: z.string().optional(),
    avatar_url: z.string().optional(),
    typing_test_wpm: z.coerce.number().optional().nullable(),
    typing_test_accuracy: z.coerce.number().optional().nullable(),
    typing_test_duration_seconds: z.coerce.number().optional().nullable(),
    phone: z.string().optional(),
    birth_date: z.string().optional(),
    gender: z.string().optional(),
    civil_status: z.string().optional(),
    nationality: z.string().optional(),
    current_address: z.string().optional(),
    permanent_address: z.string().optional(),
    highest_education: z.string().optional(),
    school_name: z.string().optional(),
    degree: z.string().optional(),
    graduation_year: z.any().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    emergency_contact_relationship: z.string().optional(),
    signature_data_url: z.string().optional(),
    
    // Biodata
    nick_name: z.string().optional(),
    preferred_nickname: z.string().optional(),
    place_of_birth: z.string().optional(),
    sss_no: z.string().optional(),
    tin_no: z.string().optional(),
    pagibig_no: z.string().optional(),
    philhealth_no: z.string().optional(),
    flexible_schedule: z.coerce.boolean().optional(),
    travel_method: z.string().optional(),
    
    // Family
    spouse_name: z.string().optional(),
    spouse_occupation: z.string().optional(),
    father_name: z.string().optional(),
    father_occupation: z.string().optional(),
    mother_name: z.string().optional(),
    mother_occupation: z.string().optional(),
    num_children: z.any().optional(),
    num_siblings: z.any().optional(),
    
    // Education Extended
    school_year_attended: z.string().optional(),
    is_graduated: z.coerce.boolean().optional(),
    course_strand: z.string().optional(),
    num_semesters: z.any().optional(),
    plans_to_pursue_studies: z.string().optional(),
    plans_to_go_abroad: z.string().optional(),
    
    // Medical & Habits
    has_medical_conditions: z.coerce.boolean().optional(),
    medical_conditions: z.string().optional(),
    medical_history_notes: z.string().optional(),
    drinks_alcohol: z.coerce.boolean().optional(),
    smokes: z.coerce.boolean().optional(),
    is_pregnant: z.coerce.boolean().optional(),
    
    // Skills
    skills: z.string().optional(),
    resumeName: z.string().optional().nullable(),
    hiring_source: z.string().optional(),
});

export const statusUpdateSchema = z.object({
    toStatus: z.string(),
    reason: z.string().max(500).optional(),
    patch: z.any().optional(),
});

export const typingResultSchema = z.object({
    promptText: z.string().min(20),
    typedText: z.string(),
    durationSeconds: z.number().int().positive(),
});
