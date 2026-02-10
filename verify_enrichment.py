from playwright.sync_api import sync_playwright
import time
import os

def run():
    print("Starting verification script...")
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-gl=swiftshader",
                "--enable-unsafe-swiftshader",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        )
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

        # Navigate
        print("Navigating to localhost:5173...")
        try:
            page.goto("http://localhost:5173", timeout=60000)
        except Exception as e:
            print(f"Navigation failed: {e}")
            return

        # Wait for start button visibility (handling CSS animation delay)
        print("Waiting for start button...")
        try:
            # The button has a 0.8s delay + 1.5s animation. Wait for it to be visible.
            start_btn = page.wait_for_selector("#start-btn", state="visible", timeout=30000)

            # Wait a bit more to ensure animation completes and element is stable
            time.sleep(5)

            print("Clicking Start...")
            start_btn.click(force=True)

        except Exception as e:
            print(f"Error interacting with start button: {e}")
            page.screenshot(path="verification_error_start.png")
            return

        # Wait for transition - shorter delay now
        print("Waiting for transition (2s)...")
        time.sleep(2)

        # Wait for Zone Label
        try:
            print("Waiting for Zone Label...")
            page.wait_for_selector("#zone-label.label-visible", timeout=10000)
            print("Zone Label visible")
        except Exception as e:
            print(f"Zone Label timed out: {e}")
            page.screenshot(path="verification_error_label.png")
            # Dump HTML for debugging
            print("Dumping #zone-label-container HTML:")
            print(page.inner_html("#zone-label-container"))

        # Wait for Subtitle
        try:
            print("Waiting for Subtitle...")
            # Check if subtitle element exists first
            if page.query_selector("#zone-subtitle"):
                # Wait explicitly for the class to be added
                page.wait_for_selector("#zone-subtitle.visible", timeout=10000)
                print("Zone Subtitle visible")
                subtitle_text = page.inner_text("#zone-subtitle")
                print(f"Subtitle Text: {subtitle_text}")
            else:
                print("Zone Subtitle element not found in DOM")
        except Exception as e:
            print(f"Zone Subtitle timed out: {e}")
            page.screenshot(path="verification_error_subtitle.png")

        page.screenshot(path="verification_intro.png")

        # Wait for Field Note
        # Field notes are triggered by position. The camera moves automatically.
        try:
            print("Waiting for Field Note (this may take time as camera moves)...")
            # Wait up to 30 seconds for a field note to appear
            # Initial position (0,2,0) should trigger note at (0,1.5,-10) immediately if distance < 15
            page.wait_for_selector("#field-note-container.visible", timeout=30000)
            print("Field Note visible")

            # Get text
            text = page.inner_text("#field-note-text")
            print(f"Field Note Text: {text}")

            page.screenshot(path="verification_field_note.png")
        except Exception as e:
            print(f"Field Note timed out: {e}")
            page.screenshot(path="verification_error_fieldnote.png")
            print("Dumping #field-note-container HTML:")
            print(page.inner_html("#field-note-container"))

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    run()
