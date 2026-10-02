#!/usr/bin/env python3
"""
IMVU Bot - Entrar em Sala (Selenium 4)
Fluxo:
1. Recebe --username, --password e --room-url via CLI
2. Inicia o Chrome com webdriver-manager ou Selenium Manager nativo
3. Faz login em https://secure.imvu.com/welcome/login/
4. Navega até a URL da room e permanece ativo
"""

import argparse
import sys
import time
import os

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import (
        TimeoutException,
        NoSuchElementException,
        WebDriverException
    )
except ImportError as e:
    print(f"[ERRO CRÍTICO] Dependências do Selenium não encontradas: {e}", flush=True)
    print("Execute: pip install -r requirements.txt", flush=True)
    sys.exit(1)


def log(msg):
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}", flush=True)


def parse_arguments():
    parser = argparse.ArgumentParser(description="Bot para entrar em salas do IMVU")
    parser.add_argument("--username", required=True, help="Nome de usuário / avatar do IMVU")
    parser.add_argument("--password", required=True, help="Senha do IMVU")
    parser.add_argument("--room-url", required=True, help="URL da sala do IMVU (https://www.imvu.com/next/chat/room-...)")
    return parser.parse_args()


def init_driver():
    log("Iniciando Google Chrome...")
    options = Options()
    
    # Configurações solicitadas
    options.add_argument("--start-maximized")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-infobars")
    
    # Detecção de binário do Chrome caso não esteja no PATH padrão
    candidate_binaries = [
        os.environ.get("CHROME_BIN"),
        "/usr/local/bin/google-chrome",
        "/usr/bin/google-chrome",
        "/usr/local/bin/chromium",
        "/usr/bin/chromium",
        "/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
    ]
    for candidate in candidate_binaries:
        if candidate and os.path.exists(candidate):
            options.binary_location = candidate
            log(f"Binário Chrome localizado: {candidate}")
            break

    # Se estiver rodando em container Linux sem X11 display, verificar se há DISPLAY
    # Em Linux sem display X11, headless pode ser necessário para não crashar o OS,
    # mas respeitamos janela visível quando houver display (como no Windows/desktop local).
    if sys.platform.startswith("linux") and not os.environ.get("DISPLAY"):
        log("Aviso: Variável DISPLAY não detectada no ambiente Linux. Ativando headless para evitar falha do X11.")
        options.add_argument("--headless=new")

    driver = None
    # 1. Tentar webdriver-manager se disponível
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        from selenium.webdriver.chrome.service import Service
        log("Configurando ChromeDriver via webdriver-manager...")
        driver_path = ChromeDriverManager().install()
        service = Service(driver_path)
        driver = webdriver.Chrome(service=service, options=options)
    except Exception as wm_err:
        log(f"webdriver-manager aviso: {wm_err}. Tentando Selenium Manager nativo...")
        try:
            driver = webdriver.Chrome(options=options)
        except Exception as sm_err:
            log(f"[ERRO] Falha ao iniciar Chrome: {sm_err}")
            raise sm_err

    driver.set_page_load_timeout(60)
    return driver


def perform_login(driver, username, password):
    login_url = "https://secure.imvu.com/welcome/login/"
    log(f"Abrindo página de login: {login_url}")
    driver.get(login_url)

    wait = WebDriverWait(driver, 20)

    log("Aguardando formulário de login carregar...")

    # Seletores modernos para o campo de usuário/avatar
    user_selectors = [
        (By.CSS_SELECTOR, 'input[name="avatarname"]'),
        (By.CSS_SELECTOR, 'input[name="username"]'),
        (By.CSS_SELECTOR, 'input#login-username'),
        (By.CSS_SELECTOR, 'input[type="text"]'),
        (By.XPATH, '//input[@name="avatarname" or @name="username"]')
    ]

    user_input = None
    for by, selector in user_selectors:
        try:
            user_input = wait.until(EC.element_to_be_clickable((by, selector)))
            if user_input:
                log(f"Campo de usuário localizado via seletor: {selector}")
                break
        except TimeoutException:
            continue

    if not user_input:
        raise Exception("Campo de nome de usuário não foi encontrado na tela de login.")

    # Digitar usuário
    user_input.clear()
    user_input.send_keys(username)
    log(f"Nome de usuário '{username}' inserido.")

    # Seletores para o campo de senha
    pass_selectors = [
        (By.CSS_SELECTOR, 'input[name="password"]'),
        (By.CSS_SELECTOR, 'input#login-password'),
        (By.CSS_SELECTOR, 'input[type="password"]'),
        (By.XPATH, '//input[@type="password"]')
    ]

    pass_input = None
    for by, selector in pass_selectors:
        try:
            pass_input = driver.find_element(by, selector)
            if pass_input.is_displayed():
                log(f"Campo de senha localizado via seletor: {selector}")
                break
        except NoSuchElementException:
            continue

    if not pass_input:
        raise Exception("Campo de senha não foi encontrado na tela de login.")

    pass_input.clear()
    pass_input.send_keys(password)
    log("Senha inserida.")

    # Seletores para botão de login
    btn_selectors = [
        (By.CSS_SELECTOR, 'button[type="submit"]'),
        (By.CSS_SELECTOR, 'button.login-button'),
        (By.CSS_SELECTOR, 'button#login-btn'),
        (By.XPATH, '//button[contains(translate(., "ENTRAR", "entrar"), "entrar") or contains(translate(., "LOGIN", "login"), "login") or @type="submit"]')
    ]

    login_btn = None
    for by, selector in btn_selectors:
        try:
            login_btn = driver.find_element(by, selector)
            if login_btn.is_displayed():
                log(f"Botão de login localizado via seletor: {selector}")
                break
        except NoSuchElementException:
            continue

    if login_btn:
        login_btn.click()
    else:
        log("Botão de login não encontrado explicitamente, pressionando ENTER no campo de senha...")
        pass_input.send_keys(Keys.RETURN)

    log("Credenciais enviadas. Aguardando autenticação e redirecionamento...")

    # Aguardar até que saia da página de login ou apareça elemento de usuário logado
    time.sleep(5)
    
    # Verificar se ainda estamos na página de login com mensagem de erro
    current_url = driver.current_url
    log(f"URL pós-login: {current_url}")

    # Verificar mensagens de erro comuns
    error_selectors = [
        (By.CSS_SELECTOR, '.error-message'),
        (By.CSS_SELECTOR, '.alert-danger'),
        (By.CSS_SELECTOR, '[data-qa="error-message"]')
    ]
    for by, selector in error_selectors:
        try:
            err_el = driver.find_element(by, selector)
            if err_el.is_displayed() and err_el.text.strip():
                raise Exception(f"Erro informado pelo IMVU: {err_el.text.strip()}")
        except NoSuchElementException:
            pass

    log("Autenticação realizada com sucesso!")


def join_room(driver, room_url):
    # Validar formato da room URL
    if "/next/chat/room-" not in room_url:
        log(f"Aviso: A URL fornecida ({room_url}) não segue o padrão estrito '/next/chat/room-', mas continuaremos.")
    
    log(f"Navegando para a sala: {room_url}")
    driver.get(room_url)

    # Esperar carregamento da sala
    log("Aguardando carregamento da sala IMVU...")
    time.sleep(6)

    final_url = driver.current_url
    log(f"Conectado à sala! URL atual: {final_url}")
    log("Bot presente na sala. Mantendo sessão ativa...")


def main():
    args = parse_arguments()

    username = args.username.strip()
    password = args.password.strip()
    room_url = args.room_url.strip()

    if not username or not password or not room_url:
        log("[ERRO] Parâmetros obrigatórios ausentes: username, password ou room_url.")
        sys.exit(1)

    driver = None
    try:
        log(f"=== INICIANDO BOT PARA {username} ===")
        log(f"Sala alvo: {room_url}")
        
        driver = init_driver()
        perform_login(driver, username, password)
        join_room(driver, room_url)

        log("=== BOT ATIVO E FUNCIONANDO ===")
        # Manter processo vivo até que seja interrompido pelo backend ou usuário feche janela
        while True:
            try:
                # Verifica se a janela ainda está aberta
                _ = driver.window_handles
                time.sleep(2)
            except WebDriverException:
                log("Navegador foi fechado pelo usuário ou conexão foi perdida.")
                break

    except Exception as e:
        log(f"[FALHA NA EXECUÇÃO]: {str(e)}")
        sys.exit(1)
    finally:
        if driver:
            try:
                log("Encerrando navegador Chrome...")
                driver.quit()
            except Exception:
                pass
        log("Processo do bot finalizado.")


if __name__ == "__main__":
    main()
