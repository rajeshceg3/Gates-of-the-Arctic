import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # Pass flags to avoid WebGL stalls
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--enable-unsafe-swiftshader',
                '--disable-gpu',
                '--use-gl=swiftshader'
            ]
        )
        page = await browser.new_page()

        # Abort font requests and animations to prevent hanging
        await page.route("**/*.{woff,woff2,ttf}", lambda route: route.abort())
        await page.add_init_script("""
            Object.defineProperty(document, 'fonts', {
                value: { ready: Promise.resolve() },
                writable: false
            });
            const style = document.createElement('style');
            style.textContent = `* { animation: none !important; transition: none !important; }`;
            document.documentElement.appendChild(style);
        """)

        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err.message}"))

        print("Navigating to preview...")
        await page.goto("http://localhost:4173")

        print("Waiting for start button...")
        start_btn = page.locator("#start-btn")
        await start_btn.wait_for(state="attached", timeout=5000)

        print("Clicking start button...")
        # Give some time for loading
        await page.wait_for_timeout(2000)
        await page.evaluate("document.getElementById('start-btn').click()")

        # Wait a bit for HUD to show
        await page.wait_for_timeout(2000)

        print("Checking for Zone Label visibility...")
        zone_label = page.locator("#zone-label")
        is_visible = await zone_label.evaluate("el => getComputedStyle(el).opacity !== '0'")
        print(f"Zone Label is visible: {is_visible}")

        # Try to screenshot without awaiting fonts
        await page.screenshot(path="verification_ux.png", animations="disabled")
        print("Screenshot saved to verification_ux.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
