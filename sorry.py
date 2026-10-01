import pyautogui
import time

# Time to switch to WhatsApp chat (5 seconds)
time.sleep(5)

# Number of times to send "Sorry"
repeat = 100

for i in range(repeat):
    pyautogui.typewrite("Sorry")
    pyautogui.press("enter")
    time.sleep(2)