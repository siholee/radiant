# Vultr 배포 보안 체크리스트

## 💻 권장 서버 스펙

### 운영체제 (OS)
- **권장**: Ubuntu 22.04 LTS (Jammy Jellyfish) ⭐
- **대안**: Ubuntu 24.04 LTS
- **아키텍처**: x64

**Ubuntu 22.04 LTS를 권장하는 이유:**
- 장기 지원 (2027년까지)
- Docker 공식 지원
- 커뮤니티 문서 풍부
- 안정성 검증됨
- Certbot (Let's Encrypt) 완벽 지원
- 보안 패치 자동 업데이트

**피해야 할 OS:**
- ❌ CentOS/RHEL (패키지 관리 복잡)
- ❌ Debian 10 이하 (구버전)
- ❌ Windows Server (Docker 성능 이슈)

### 최소 사양 (개발/테스트)
- **vCPU**: 2 Core
- **메모리**: 4 GB RAM
- **스토리지**: 80 GB SSD
- **대역폭**: 3 TB
- **예상 비용**: ~$18/월

**적합한 용도:**
- 개발/스테이징 환경
- 소규모 테스트
- 월 1만 방문자 이하

### 권장 사양 (프로덕션 - 소규모)
- **vCPU**: 4 Core
- **메모리**: 8 GB RAM
- **스토리지**: 160 GB SSD
- **대역폭**: 4 TB
- **예상 비용**: ~$36/월

**적합한 용도:**
- 프로덕션 환경 시작
- 월 10만 방문자
- 동시 사용자 ~500명
- AI 블로그 생성 월 100건

### 프로덕션 사양 (권장)
- **vCPU**: 6 Core
- **메모리**: 16 GB RAM
- **스토리지**: 320 GB SSD
- **대역폭**: 5 TB
- **예상 비용**: ~$72/월

**적합한 용도:**
- 본격적인 프로덕션
- 월 50만 방문자
- 동시 사용자 ~2,000명
- AI 블로그 생성 월 500건
- pgvector 임베딩 작업 원활

### 고성능 사양 (대규모 트래픽)
- **vCPU**: 8+ Core
- **메모리**: 32 GB RAM
- **스토리지**: 640 GB SSD
- **대역폭**: 6 TB
- **예상 비용**: ~$144/월

**적합한 용도:**
- 대규모 트래픽
- 월 100만+ 방문자
- 동시 사용자 5,000명+
- 대량 AI 생성 작업

### 📊 리소스 사용 예상치

**Docker 컨테이너별 메모리 사용:**
- Next.js App: ~512 MB - 1 GB
- PostgreSQL (pgvector): ~256 MB - 1 GB
- Redis: ~50 MB - 200 MB
- Nginx: ~10 MB - 50 MB
- Python CrewAI (실행 시): ~500 MB - 2 GB

**스토리지 사용:**
- Docker 이미지: ~3 GB
- 애플리케이션 코드: ~500 MB
- 데이터베이스 (초기): ~100 MB
- 로그 파일: ~1 GB/월
- 여유 공간: 최소 50% 권장

### 🚀 스케일링 전략

**트래픽 증가 시 업그레이드 순서:**
1. **메모리 먼저**: 4GB → 8GB → 16GB
2. **vCPU 다음**: 2 Core → 4 Core → 6 Core
3. **스토리지 나중**: 필요 시 증설

**모니터링 지표:**
```bash
# 메모리 사용률이 80% 넘으면 업그레이드
free -h

# CPU 사용률이 지속적으로 70% 넘으면 업그레이드
htop

# 디스크 사용률이 70% 넘으면 증설
df -h
```

---

## 🎯 배포 전 필수 체크리스트

### 1단계: 서버 초기 설정 (최초 1회만)

```bash
# Vultr 서버 생성 후 root로 SSH 접속
ssh root@YOUR_SERVER_IP

# 보안 강화 스크립트 실행
cd /root
git clone https://github.com/YOUR_USERNAME/radiant.git
cd radiant
bash vultr-setup.sh
```

이 스크립트가 자동으로 설정하는 항목:
- ✅ UFW 방화벽 (포트 22, 80, 443만 오픈)
- ✅ Fail2ban (SSH, Nginx 공격 차단)
- ✅ SSH 강화 (키 기반 인증, root 로그인 금지)
- ✅ 자동 보안 업데이트
- ✅ Docker & Docker Compose
- ✅ Nginx 설치 및 보안 헤더
- ✅ Certbot (Let's Encrypt SSL)
- ✅ 시스템 튜닝

### 2단계: 환경 변수 설정

```bash
# deploy 유저로 전환
su - deploy
cd /var/www/radiant

# .env 파일 생성
cp .env.example .env
nano .env
```

**필수: 모든 비밀 키를 강력하게 생성하세요!**

```bash
# 터미널에서 각각 실행하여 생성
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
echo "SESSION_SECRET=$(openssl rand -hex 64)"
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo "ENCRYPTION_KEY_V1=$(openssl rand -hex 32)"
```

### 3단계: SSL 인증서 설정

```bash
# Nginx 설정 복사
sudo cp nginx.conf /etc/nginx/sites-available/yurasis.com
sudo ln -s /etc/nginx/sites-available/yurasis.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # 기본 사이트 제거

# Nginx 설정 테스트
sudo nginx -t

# Let's Encrypt SSL 인증서 발급
sudo certbot --nginx -d yurasis.com -d www.yurasis.com --non-interactive --agree-tos -m your-email@example.com

# 자동 갱신 확인
sudo certbot renew --dry-run
```

### 4단계: 애플리케이션 배포

```bash
# 배포 스크립트 실행 (deploy 유저로)
cd /var/www/radiant
bash deploy.sh
```

---

## 🛡️ 공격 방어 시스템 (자동 활성화)

### Nginx Rate Limiting

현재 설정된 제한:
- **일반 요청**: 10 req/sec (burst 20)
- **API 요청**: 5 req/sec (burst 10)
- **인증 요청**: 3 req/min (burst 5)

초과 시 **429 Too Many Requests** 반환

### Fail2ban 자동 차단

다음 조건에서 IP 자동 차단:
- SSH 로그인 실패 3회 → 24시간 차단
- Nginx auth 실패 5회 → 1시간 차단
- Nginx rate limit 초과 5회 → 1시간 차단

차단된 IP 확인:
```bash
sudo fail2ban-client status nginx-limit-req
sudo fail2ban-client status sshd
```

IP 수동 차단 해제:
```bash
sudo fail2ban-client set nginx-limit-req unbanip IP_ADDRESS
```

### UFW 방화벽

```bash
# 상태 확인
sudo ufw status verbose

# 허용된 포트만 접근 가능:
# - 22 (SSH)
# - 80 (HTTP → HTTPS로 리다이렉트)
# - 443 (HTTPS)

# 기타 모든 포트는 차단됨
# - 5432 (PostgreSQL) ✅ 외부 접근 불가
# - 6379 (Redis) ✅ 외부 접근 불가
# - 3000 (Next.js) ✅ 외부 접근 불가
```

---

## 🔍 배포 후 보안 점검

### 1. 포트 스캔 테스트

```bash
# 외부에서 열린 포트 확인 (다른 컴퓨터에서 실행)
nmap -sV YOUR_SERVER_IP

# 예상 결과:
# PORT    STATE SERVICE
# 22/tcp  open  ssh
# 80/tcp  open  http
# 443/tcp open  https
```

### 2. SSL 인증서 확인

```bash
# SSL Labs에서 A+ 등급 확인
# https://www.ssllabs.com/ssltest/analyze.html?d=yurasis.com
```

### 3. 보안 헤더 확인

```bash
curl -I https://yurasis.com | grep -i "security\|xss\|content-security\|strict-transport"

# 예상 결과:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: ...
```

### 4. Rate Limiting 테스트

```bash
# 짧은 시간에 여러 요청 전송
for i in {1..50}; do curl -s -o /dev/null -w "%{http_code}\n" https://yurasis.com/api/auth/login; done

# 예상 결과: 처음 몇 개는 200/401, 이후 429 (Too Many Requests)
```

### 5. 데이터베이스 외부 접근 차단 확인

```bash
# 다른 컴퓨터에서 실행 (연결 실패해야 정상)
telnet YOUR_SERVER_IP 5432

# 예상 결과: Connection refused 또는 timeout
```

---

## 🚨 긴급 대응 매뉴얼

### DDoS 공격 감지 시

```bash
# 1. 실시간 접속 IP 확인
sudo tail -f /var/log/nginx/yurasis.com.access.log

# 2. 특정 IP 수동 차단
sudo ufw deny from ATTACKER_IP

# 3. Fail2ban으로 영구 차단
sudo fail2ban-client set nginx-limit-req banip ATTACKER_IP

# 4. CloudFlare "Under Attack" 모드 활성화 (사용 시)
```

### 시스템 리소스 모니터링

```bash
# CPU, 메모리 사용률 확인
htop

# 디스크 사용량
df -h

# 네트워크 연결 확인
ss -tunap

# Docker 컨테이너 상태
docker compose ps
docker stats
```

### 로그 분석

```bash
# Nginx 에러 로그
sudo tail -f /var/log/nginx/yurasis.com.error.log

# Fail2ban 로그
sudo tail -f /var/log/fail2ban.log

# 애플리케이션 로그
docker compose logs -f app --tail 100
```

---

## 🔐 추가 보안 권장사항

### 1. CloudFlare 사용 (강력 권장)

**장점:**
- DDoS 보호
- 웹 방화벽 (WAF)
- 봇 차단
- 실제 서버 IP 숨김
- 무료 플랜으로도 충분

**설정:**
1. CloudFlare에 도메인 추가
2. 네임서버 변경
3. SSL/TLS: Full (strict)
4. Firewall Rules 추가
5. Rate Limiting 추가
6. Bot Fight Mode 활성화

### 2. 정기 백업

```bash
# 데이터베이스 백업
docker compose exec postgres pg_dump -U radiant radiant > backup_$(date +%Y%m%d).sql

# 백업 자동화 (crontab)
0 2 * * * cd /var/www/radiant && docker compose exec -T postgres pg_dump -U radiant radiant > /backups/db_$(date +\%Y\%m\%d).sql
```

### 3. 모니터링 설정

```bash
# Uptime Robot (무료) - 다운타임 모니터링
# https://uptimerobot.com

# Sentry (무료) - 에러 트래킹
# Next.js에 Sentry SDK 추가
```

### 4. 정기 보안 업데이트

```bash
# 매주 실행 권장
sudo apt update
sudo apt upgrade -y
sudo reboot
```

---

## ✅ 최종 체크리스트

배포 전 이 항목들을 모두 확인하세요:

- [ ] `vultr-setup.sh` 실행 완료
- [ ] UFW 방화벽 활성화 (`sudo ufw status`)
- [ ] Fail2ban 실행 중 (`sudo systemctl status fail2ban`)
- [ ] SSH 키 기반 인증 설정
- [ ] root 로그인 비활성화
- [ ] `.env` 파일에 강력한 비밀 키 설정
- [ ] Let's Encrypt SSL 인증서 발급
- [ ] Nginx 보안 헤더 적용
- [ ] Rate Limiting 동작 확인
- [ ] 포트 5432, 6379, 3000 외부 차단 확인
- [ ] 데이터베이스 백업 설정
- [ ] CloudFlare 설정 (선택)
- [ ] 모니터링 도구 설정 (선택)

---

## 📞 문제 발생 시

1. **로그 확인**: `docker compose logs -f`
2. **컨테이너 상태**: `docker compose ps`
3. **방화벽 로그**: `sudo tail -f /var/log/ufw.log`
4. **Fail2ban 상태**: `sudo fail2ban-client status`

**긴급 복구:**
```bash
# 컨테이너 재시작
docker compose restart

# 전체 재배포
cd /var/www/radiant
git pull origin main
bash deploy.sh
```
