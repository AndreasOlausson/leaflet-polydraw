# GitHub Pages Setup Guide

## Current Issues and Solutions

Your GitHub Pages deployment is failing with a 404 error. Here are the steps to fix it:

### 1. Configure GitHub Pages Source

You need to configure your repository to use GitHub Actions for Pages deployment:

1. Go to your repository on GitHub: `https://github.com/AndreasOlausson/leaflet-polydraw`
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")

### 2. Repository Structure Issues Fixed

I've updated your `.github/workflows/deploy-demo.yml` to:

- Use the modern GitHub Pages Actions workflow
- Properly build both the main package and demo
- Install dependencies in the correct order
- Remove the incorrect CNAME configuration

### 3. Expected URL

After the fix, your demo should be available at:
`https://andreasolausson.github.io/leaflet-polydraw/`

### 4. Troubleshooting Steps

If you're still getting 404 errors:

1. **Check workflow runs**: Go to the Actions tab in your repository and verify the workflow is running successfully
2. **Verify Pages settings**: Ensure GitHub Pages source is set to "GitHub Actions"
3. **Check the build output**: Make sure the demo builds correctly locally
4. **Wait for propagation**: GitHub Pages can take a few minutes to update

### 5. Test Locally

To test the demo locally before deploying:

```bash
cd Leaflet.Polydraw
npm install
npm run build
cd demo
npm install
npm run build
npm run preview
```

### 6. Common Issues

- **404 on assets**: Make sure the Vite base path is set to `/leaflet-polydraw/`
- **Build failures**: Ensure all dependencies are installed correctly
- **Permissions**: The workflow now uses the correct permissions for GitHub Pages

## Next Steps

1. Push these changes to your main branch
2. Configure GitHub Pages source to use GitHub Actions
3. Wait for the workflow to complete
4. Visit `https://andreasolausson.github.io/leaflet-polydraw/`
