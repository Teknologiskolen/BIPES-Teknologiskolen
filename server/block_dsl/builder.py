from __future__ import annotations


def snake_case(name: str) -> str:
    out: list[str] = []
    for i, ch in enumerate(name):
        if i > 0 and ch.isupper() and not name[i - 1].isupper():
            out.append("_")
        out.append(ch.lower())
    return "".join(out)


def humanize_identifier(name: str) -> str:
    acronym_words = {
        "adc": "ADC",
        "clk": "CLK",
        "cs": "CS",
        "dat": "DAT",
        "dc": "DC",
        "i2c": "I2C",
        "id": "ID",
        "led": "LED",
        "miso": "MISO",
        "mosi": "MOSI",
        "pwm": "PWM",
        "rgb": "RGB",
        "rst": "RST",
        "rtc": "RTC",
        "scl": "SCL",
        "sck": "SCK",
        "sda": "SDA",
        "spi": "SPI",
        "tx": "TX",
        "rx": "RX",
        "uart": "UART",
    }
    normalized = name.replace("_", " ").replace("-", " ")
    out: list[str] = []
    for i, ch in enumerate(normalized):
        next_ch = normalized[i + 1] if i + 1 < len(normalized) else ""
        if (
            i > 0
            and ch.isupper()
            and not normalized[i - 1].isspace()
            and (
                normalized[i - 1].islower()
                or (normalized[i - 1].isupper() and next_ch.islower())
            )
        ):
            out.append(" ")
        elif i > 0 and ch.isdigit() and normalized[i - 1].isalpha() and normalized[i - 1].islower():
            out.append(" ")
        out.append(ch)

    words = "".join(out).split()
    result_words: list[str] = []
    for word in words:
        mapped = acronym_words.get(word.lower())
        if mapped is not None:
            result_words.append(mapped)
        else:
            result_words.append(word[:1].upper() + word[1:])
    return " ".join(result_words)
