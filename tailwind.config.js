/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                'pokemon-blue': '#3498db',
                'pokemon-red': '#e74c3c',
                'pokemon-yellow': '#f1c40f',
                'pokemon-green': '#27ae60',
                'pokemon-purple': '#9b59b6',
                'pokemon-orange': '#e67e22',
            },
            animation: {
                'bounce-slow': 'bounce 2s infinite',
                'pulse-slow': 'pulse 3s infinite',
            }
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    }
}
