from playwright.sync_api import sync_playwright
import time

def verify_zones():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate
        print("Navigating to app...")
        page.goto("http://localhost:5173")

        # Wait for initial load
        time.sleep(5)

        # Click to enable audio/interaction (removes overlay if any)
        # The instructions overlay is #instructions. It fades out on click.
        # But we also have #transition-overlay.

        print("Clicking to start...")
        page.mouse.click(100, 100)
        time.sleep(2)

        # Tundra
        print("Capturing Tundra...")
        page.screenshot(path="verification/zone1_tundra.png")

        # Mountain
        print("Switching to Mountain (2)...")
        page.keyboard.press("2")
        time.sleep(2) # Wait for fade (1s out + load + 1s in)
        page.screenshot(path="verification/zone2_mountain.png")

        # River
        print("Switching to River (3)...")
        page.keyboard.press("3")
        time.sleep(2)
        page.screenshot(path="verification/zone3_river.png")

        # Forest
        print("Switching to Forest (4)...")
        page.keyboard.press("4")
        time.sleep(2)
        page.screenshot(path="verification/zone4_forest.png")

        # Sky
        print("Switching to Sky (5)...")
        page.keyboard.press("5")
        time.sleep(2)
        page.screenshot(path="verification/zone5_sky.png")

        browser.close()

if __name__ == "__main__":
    verify_zones()
