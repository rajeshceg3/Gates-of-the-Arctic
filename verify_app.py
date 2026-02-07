from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to app
        page.goto("http://localhost:5173")

        # Wait for canvas to be present (rendering started)
        page.wait_for_selector("canvas")

        # Wait a bit for the scene to initialize (Zones are async)
        page.wait_for_timeout(3000)

        # Take a screenshot of the initial state (with UI potentially visible)
        page.screenshot(path="verification_initial.png")

        # Click to dismiss UI / start audio
        page.mouse.click(window.innerWidth / 2, window.innerHeight / 2)

        # Wait for fade out
        page.wait_for_timeout(2000)

        # Take a screenshot of the "clean" state
        page.screenshot(path="verification_clean.png")

        browser.close()

if __name__ == "__main__":
    import math
    # Need to mock window dimensions for python script? No, playwright handles browser window.
    # But `window.innerWidth` is JS. In python we just use coordinates.
    # Let's just hardcode center click.

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        print("Navigating...")
        page.goto("http://localhost:5173")

        print("Waiting for canvas...")
        page.wait_for_selector("canvas")

        print("Waiting for scene load...")
        page.wait_for_timeout(5000) # Give it time to generate terrain

        print("Taking initial screenshot...")
        page.screenshot(path="verification_initial.png")

        print("Clicking to start...")
        page.mouse.click(640, 360)

        print("Waiting for UI fade...")
        page.wait_for_timeout(2000)

        print("Taking clean screenshot...")
        page.screenshot(path="verification_clean.png")

        browser.close()
