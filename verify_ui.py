from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gl-drawing-for-tests",
                "--enable-unsafe-swiftshader",
                "--use-gl=swiftshader"
            ]
        )
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5173")
            page.wait_for_timeout(3000) # Wait for initial load

            print("Taking screenshot of Landing Screen...")
            page.screenshot(path="verification_1_landing.png")

            print("Clicking Start Button...")
            # Ensure button is visible and clickable
            page.wait_for_selector("#start-btn", state="visible")
            page.click("#start-btn")

            print("Waiting for transition (simulating user wait)...")
            page.wait_for_timeout(5000) # Wait for fade out and HUD fade in

            print("Taking screenshot of HUD...")
            page.screenshot(path="verification_2_hud.png")

            print("Checking for Settings Button...")
            settings_btn = page.locator("#settings-btn")
            if settings_btn.is_visible():
                print("Settings button is visible.")
            else:
                print("Settings button is NOT visible.")

            print("Clicking Settings Button (Forced)...")
            # Force click because of complex z-index layering which might confuse Playwright's hit-test
            settings_btn.click(force=True)
            page.wait_for_timeout(2000) # Wait for fade in

            print("Taking screenshot of Settings Menu...")
            page.screenshot(path="verification_3_settings.png")

            print("Verification Complete.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification_error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
