export const DEMO_CREDENTIALS = [
    {
        email: 'admin@cp-360.com',
        password: 'password123',
        label: 'Alexander Vance',
        role: 'Admin'
    },
    {
        email: 'recruiter@cp-360.com',
        password: 'password123',
        label: 'Elena Rostova',
        role: 'Recruiter'
    },
    {
        email: 'ops@cp-360.com',
        password: 'password123',
        label: 'Marcus Thorne',
        role: 'Ops Validator'
    },
    {
        email: 'interviewer@cp-360.com',
        password: 'password123',
        label: 'Sofia Chen',
        role: 'Interviewer'
    }
];

export const DEMO_APPLICANT_DATA = {
    form: {
        full_name: 'Johnathan Doe',
        nick_name: 'John',
        email: `john.doe.${Date.now()}@example.com`,
        phone: '09171234567',
        birth_date: '1995-06-15',
        place_of_birth: 'Cebu City',
        sex: 'Male',
        civil_status: 'Single',
        nationality: 'Filipino',
        current_address: '123 Alpha St, IT Park, Lahug, Cebu City',
        permanent_address: '123 Alpha St, IT Park, Lahug, Cebu City',
        sss_no: '34-5678901-2',
        tin_no: '123-456-789-000',
        pagibig_no: '1210-3456-7890',
        philhealth_no: '12-345678901-2',
        flexible_schedule: true,
        travel_method: 'Commute via Jeepney/Bus',
        spouse_name: '',
        spouse_occupation: '',
        father_name: 'Robert Doe',
        father_occupation: 'Engineer',
        mother_name: 'Mary Doe',
        mother_occupation: 'Teacher',
        num_children: 0,
        num_siblings: 2,
        highest_education: 'College Graduate',
        school_name: 'University of San Carlos',
        school_year_attended: '2012 - 2016',
        is_graduated: true,
        course_strand: 'Bachelor of Science in Information Technology',
        course_year: '4th Year',
        num_semesters: 8,
        plans_to_pursue_studies: 'No plans in the near future',
        plans_to_go_abroad: 'No plans to go abroad',
        has_medical_conditions: false,
        medical_conditions: [],
        medical_history_notes: 'None',
        drinks_alcohol: false,
        smokes: false,
        is_pregnant: false,
        skills: 'React, TypeScript, Node.js, Customer Service, Tech Support',
        languages: 'English, Cebuano, Tagalog',
        certifications: 'ITIL v4, CCNA',
        emergency_contact_name: 'Robert Doe',
        emergency_contact_phone: '09177654321',
        emergency_contact_relationship: 'Father',
        signature_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 transparent pixel signature
        form_submitted_at: new Date().toISOString(),
    },
    workExperience: [
        {
            company: 'Tech Support Solutions Inc.',
            position: 'Technical Support Representative',
            duration_from: '2017-08',
            duration_to: '2020-10',
            description: 'Handled customer inquiries, resolved network connectivity issues, and assisted users with hardware troubleshooting.'
        },
        {
            company: 'Contact Center Hub',
            position: 'Customer Service Representative',
            duration_from: '2021-02',
            duration_to: '2023-12',
            description: 'Provided exceptional service to US-based customers, processed orders, resolved billing concerns, and upskilled junior agents.'
        }
    ]
};
