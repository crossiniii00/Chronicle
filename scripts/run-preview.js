import { execSync } from 'child_process';
try {
    execSync('npx vite preview --host 0.0.0.0 --port 5173', { stdio: 'inherit' });
} catch (e) {
    console.error('Frontend preview server stopped:', e.message);
    process.exit(1);
}
