import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// 1. Get Posts (top-level only, with author info, comments, reactions, polls, and thread counts)
router.get('/posts', async (req, res) => {
    try {
        const userDepts = (req.user.department || '').split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
        const userRole = req.user.role;
        const isOpsVal = ['ops_validator', 'guest_interviewer'].includes(userRole);
        
        let isRecruiter = userRole === 'recruiter' || userRole.startsWith('recruiter_');
        let isOverseer = userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin' || isRecruiter || userDepts.includes('OVERSEER');

        try {
            const configRes = await query("SELECT config_data FROM report_configs WHERE id = 'account_type_settings'");
            if (configRes.rows.length > 0) {
                const configData = configRes.rows[0].config_data || {};
                const roleTypes = configData.roleTypes || {};
                const resolvedType = roleTypes[userRole];
                if (resolvedType === 'recruiter') {
                    isRecruiter = true;
                    isOverseer = true;
                } else if (resolvedType === 'admin') {
                    isOverseer = true;
                }
            }
        } catch (e) {
            console.error('[Forums] Error resolving custom role type:', e);
        }

        const isAdminOrRecruiter = isRecruiter || userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin' || isOverseer;

        const postsRes = await query(`
            SELECT 
                p.id, p.content, p.type, p.created_at, p.parent_id, p.image_data, p.department,
                json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'avatar_data', u.avatar_data, 'department', u.department, 'role', u.role) as author,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', c.id, 
                            'content', c.content, 
                            'created_at', c.created_at,
                            'author', json_build_object('id', cu.id, 'full_name', cu.full_name, 'avatar_data', cu.avatar_data)
                        )
                    )
                    FROM forum_comments c
                    JOIN users cu ON c.author_id = cu.id
                    WHERE c.post_id = p.id
                ) as comments,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', r.id,
                            'reaction_type', r.reaction_type,
                            'user_id', r.user_id,
                            'user_name', ru.full_name
                        )
                    )
                    FROM forum_reactions r
                    JOIN users ru ON r.user_id = ru.id
                    WHERE r.post_id = p.id AND r.comment_id IS NULL
                ) as reactions,
                (
                    SELECT json_build_object(
                        'id', poll.id,
                        'question', poll.question,
                        'options', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', po.id,
                                    'option_text', po.option_text,
                                    'votes', (
                                        SELECT json_agg(json_build_object('user_id', pv.user_id))
                                        FROM forum_poll_votes pv
                                        WHERE pv.poll_option_id = po.id
                                    )
                                )
                            )
                            FROM forum_poll_options po
                            WHERE po.poll_id = poll.id
                        )
                    )
                    FROM forum_polls poll
                    WHERE poll.post_id = p.id
                ) as poll,
                (
                    SELECT COUNT(*)::int FROM forum_posts tp WHERE tp.parent_id = p.id
                ) as thread_count,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', tu.id,
                            'full_name', tu.full_name,
                            'avatar_data', tu.avatar_data
                        )
                    )
                    FROM (
                        SELECT DISTINCT ON (tp.author_id) tu.id, tu.full_name, tu.avatar_data, tp.created_at
                        FROM forum_posts tp
                        JOIN users tu ON tp.author_id = tu.id
                        WHERE tp.parent_id = p.id
                        ORDER BY tp.author_id, tp.created_at DESC
                    ) tu
                ) as thread_participants
            FROM forum_posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.parent_id IS NULL
              AND (
                $4::boolean OR
                COALESCE(p.department, u.department, '') = '' OR
                EXISTS (
                   SELECT 1 FROM unnest(string_to_array(COALESCE(p.department, u.department), ',')) AS post_dept
                   WHERE TRIM(UPPER(post_dept)) = ANY($1::text[])
                )
              )
              AND (
                CASE 
                  WHEN $2::boolean THEN NOT (u.role IN ('recruiter', 'admin', 'super_admin', 'superadmin') OR u.role LIKE 'recruiter_%' OR u.role LIKE 'custom_%')
                  WHEN $3::boolean THEN NOT (u.role IN ('ops_validator', 'guest_interviewer'))
                  ELSE TRUE
                END
              )
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [userDepts, isOpsVal, isAdminOrRecruiter, isOverseer]);
        
        res.json(postsRes.rows);
    } catch (e) {
        console.error('[Forums] Error fetching posts:', e);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// 1.5 Get user's total forum posts count
router.get('/posts/count', async (req, res) => {
    const author_id = req.user.id;
    try {
        const countRes = await query('SELECT COUNT(*)::int FROM forum_posts WHERE author_id = $1', [author_id]);
        res.json({ count: countRes.rows[0].count });
    } catch (e) {
        console.error('[Forums] Error counting posts:', e);
        res.status(500).json({ error: 'Failed to count posts' });
    }
});

// 2. Get Thread (parent + all messages under it)
router.get('/posts/:id/thread', async (req, res) => {
    const { id } = req.params;
    try {
        const parentRes = await query(`
            SELECT 
                p.id, p.content, p.type, p.created_at, p.parent_id, p.image_data, p.department,
                json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'avatar_data', u.avatar_data, 'department', u.department, 'role', u.role) as author,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', r.id,
                            'reaction_type', r.reaction_type,
                            'user_id', r.user_id,
                            'user_name', ru.full_name
                        )
                    )
                    FROM forum_reactions r
                    JOIN users ru ON r.user_id = ru.id
                    WHERE r.post_id = p.id AND r.comment_id IS NULL
                ) as reactions
            FROM forum_posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = $1
        `, [id]);

        if (parentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const parentPost = parentRes.rows[0];
        const userDepts = (req.user.department || '').split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
        const userRole = req.user.role;
        let isOverseer = userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin' || userRole === 'recruiter' || userRole.startsWith('recruiter_') || userDepts.includes('OVERSEER');

        try {
            const configRes = await query("SELECT config_data FROM report_configs WHERE id = 'account_type_settings'");
            if (configRes.rows.length > 0) {
                const configData = configRes.rows[0].config_data || {};
                const roleTypes = configData.roleTypes || {};
                const resolvedType = roleTypes[userRole];
                if (resolvedType === 'admin' || resolvedType === 'recruiter') {
                    isOverseer = true;
                }
            }
        } catch (e) {
            console.error('[Forums] Error resolving custom role type in thread:', e);
        }
        
        if (!isOverseer) {
            const postDeptStr = parentPost.department || (parentPost.author && parentPost.author.department) || '';
            if (postDeptStr) {
                const postDepts = postDeptStr.split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
                const hasAccess = postDepts.some(d => userDepts.includes(d));
                if (!hasAccess) {
                    return res.status(403).json({ error: 'Access denied to this post' });
                }
            }
        }

        const messagesRes = await query(`
            SELECT 
                p.id, p.content, p.type, p.created_at, p.parent_id, p.image_data, p.department,
                json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'avatar_data', u.avatar_data, 'department', u.department, 'role', u.role) as author,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', r.id,
                            'reaction_type', r.reaction_type,
                            'user_id', r.user_id,
                            'user_name', ru.full_name
                        )
                    )
                    FROM forum_reactions r
                    JOIN users ru ON r.user_id = ru.id
                    WHERE r.post_id = p.id AND r.comment_id IS NULL
                ) as reactions
            FROM forum_posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.parent_id = $1
            ORDER BY p.created_at ASC
        `, [id]);

        res.json({
            parent: parentPost,
            messages: messagesRes.rows
        });
    } catch (e) {
        console.error('[Forums] Error fetching thread:', e);
        res.status(500).json({ error: 'Failed to fetch thread' });
    }
});

// 3. Create Post (or thread message)
router.post('/posts', async (req, res) => {
    const { content, type, poll, parent_id, image_data, department } = req.body;
    const author_id = req.user.id;

    const trimmedContent = (content || '').trim();
    const isPoll = type === 'poll' && poll && poll.question && poll.options && poll.options.length >= 2;

    if (!trimmedContent && !isPoll && !image_data) {
        return res.status(400).json({ error: 'Content, an image, or a valid poll is required' });
    }

    let resolvedDepartment = department || null;

    if (parent_id) {
        const parentRes = await query('SELECT id, department FROM forum_posts WHERE id = $1', [parent_id]);
        if (parentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Parent post not found' });
        }
        // Thread replies inherit the parent post's department to stay in the same account context
        resolvedDepartment = parentRes.rows[0].department;
    }

    try {
        await query('BEGIN');

        const postRes = await query(
            'INSERT INTO forum_posts (author_id, content, type, parent_id, image_data, department) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [author_id, trimmedContent || null, type || 'text', parent_id || null, image_data || null, resolvedDepartment]
        );
        const post = postRes.rows[0];

        if (isPoll) {
            const pollRes = await query(
                'INSERT INTO forum_polls (post_id, question) VALUES ($1, $2) RETURNING id',
                [post.id, poll.question]
            );
            const pollId = pollRes.rows[0].id;

            for (const opt of poll.options) {
                if (opt.trim()) {
                    await query(
                        'INSERT INTO forum_poll_options (poll_id, option_text) VALUES ($1, $2)',
                        [pollId, opt.trim()]
                    );
                }
            }
        }

        await query('COMMIT');

        const userRes = await query(
            'SELECT id, full_name, email, avatar_data, department, role FROM users WHERE id = $1',
            [author_id]
        );
        post.author = userRes.rows[0];

        res.status(201).json(post);
    } catch (e) {
        await query('ROLLBACK');
        console.error('[Forums] Error creating post:', e);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// 3.5. Delete Post (only author or admin/super_admin can delete)
router.delete('/posts/:id', async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const userRole = req.user.role;

    try {
        const postRes = await query('SELECT author_id FROM forum_posts WHERE id = $1', [id]);
        if (postRes.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const post = postRes.rows[0];
        const isAuthor = post.author_id === user_id;
        const isAdmin = ['admin', 'super_admin'].includes(userRole);

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'You are not authorized to delete this post' });
        }

        await query('DELETE FROM forum_posts WHERE id = $1', [id]);
        res.json({ message: 'Post deleted successfully' });
    } catch (e) {
        console.error('[Forums] Error deleting post:', e);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// 4. Create Comment
router.post('/posts/:id/comments', async (req, res) => {
    const { content } = req.body;
    const post_id = req.params.id;
    const author_id = req.user.id;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    try {
        const commentRes = await query(
            'INSERT INTO forum_comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *',
            [post_id, author_id, content]
        );
        const comment = commentRes.rows[0];

        const userRes = await query(
            'SELECT id, full_name, email, avatar_data, department, role FROM users WHERE id = $1',
            [author_id]
        );
        comment.author = userRes.rows[0];

        res.status(201).json(comment);
    } catch (e) {
        console.error('[Forums] Error adding comment:', e);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// 5. React to Post or Comment
router.post('/react', async (req, res) => {
    const { post_id, comment_id, reaction_type } = req.body;
    const user_id = req.user.id;

    try {
        const existingRes = await query(
            'SELECT id, reaction_type FROM forum_reactions WHERE user_id = $1 AND post_id IS NOT DISTINCT FROM $2 AND comment_id IS NOT DISTINCT FROM $3',
            [user_id, post_id || null, comment_id || null]
        );

        if (existingRes.rows.length > 0) {
            const existing = existingRes.rows[0];
            if (existing.reaction_type === reaction_type) {
                await query('DELETE FROM forum_reactions WHERE id = $1', [existing.id]);
                return res.json({ status: 'removed' });
            } else {
                await query('UPDATE forum_reactions SET reaction_type = $1 WHERE id = $2', [reaction_type, existing.id]);
                return res.json({ status: 'updated' });
            }
        } else {
            await query(
                'INSERT INTO forum_reactions (user_id, post_id, comment_id, reaction_type) VALUES ($1, $2, $3, $4)',
                [user_id, post_id || null, comment_id || null, reaction_type]
            );
            return res.json({ status: 'added' });
        }
    } catch (e) {
        console.error('[Forums] Error reacting:', e);
        res.status(500).json({ error: 'Failed to react' });
    }
});

// 6. Vote on Poll
router.post('/polls/:optionId/vote', async (req, res) => {
    const { optionId: option_id } = req.params;
    const user_id = req.user.id;

    try {
        await query('BEGIN');
        
        const optionRes = await query('SELECT poll_id FROM forum_poll_options WHERE id = $1', [option_id]);
        if (optionRes.rows.length === 0) throw new Error('Option not found');
        const poll_id = optionRes.rows[0].poll_id;

        await query(`
            DELETE FROM forum_poll_votes 
            WHERE user_id = $1 AND poll_option_id IN (
                SELECT id FROM forum_poll_options WHERE poll_id = $2
            )
        `, [user_id, poll_id]);

        await query(
            'INSERT INTO forum_poll_votes (user_id, poll_option_id) VALUES ($1, $2)',
            [user_id, option_id]
        );

        await query('COMMIT');
        res.json({ status: 'voted' });
    } catch (e) {
        await query('ROLLBACK');
        console.error('[Forums] Error voting:', e);
        res.status(500).json({ error: 'Failed to vote' });
    }
});

export default router;
