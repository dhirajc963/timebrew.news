from datetime import datetime


def format_time_ampm(time_str):
    """
    Convert 24-hour time format to 12-hour AM/PM format.

    Args:
        time_str (str): Time string in 24-hour format (e.g., "19:30:00")

    Returns:
        str: Time string in 12-hour AM/PM format (e.g., "07:30 PM")
    """
    return datetime.strptime(time_str, "%H:%M:%S").strftime("%I:%M %p")
