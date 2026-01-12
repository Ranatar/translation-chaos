const animations = {
  // Анимация появления достижения
  achievementUnlock(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-notification-header">
        <span class="achievement-notification-icon">${achievement.icon}</span>
        <div class="achievement-notification-content">
          <h3>🎉 Достижение разблокировано!</h3>
          <p><strong>${achievement.title}</strong></p>
          <p class="small">${achievement.description}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Звуковой эффект (опционально)
    this.playSound('achievement');
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.5s ease forwards';
      setTimeout(() => notification.remove(), 500);
    }, 3500);
  },

  // Анимация прогресса
  updateProgress(current, total, text = '') {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (!progressFill || !progressText) return;
    
    const percent = (current / total) * 100;
    progressFill.style.width = `${percent}%`;
    
    if (text) {
      progressText.textContent = text;
    } else {
      progressText.textContent = `Шаг ${current}/${total}...`;
    }
  },

  // Конфетти при высоком счёте
  confetti() {
    // Простая конфетти анимация
    const colors = ['#667eea', '#764ba2', '#4caf50', '#ff9800', '#f44336'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}vw;
        top: -10px;
        animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
        z-index: 3000;
      `;
      
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 4000);
    }
  },

  // Пульсация элемента
  pulse(element, duration = 1000) {
    element.style.animation = `pulse ${duration}ms ease-in-out`;
    setTimeout(() => {
      element.style.animation = '';
    }, duration);
  },

  // Встряска элемента (для ошибок)
  shake(element) {
    element.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
      element.style.animation = '';
    }, 500);
  },

  // Звуковые эффекты (опционально)
  playSound(type) {
    // Можно добавить Web Audio API для звуков
    // Пока просто placeholder
    console.log(`🔊 Sound: ${type}`);
  },

  // Typing эффект для текста
  async typeText(element, text, speed = 50) {
    element.textContent = '';
    for (let i = 0; i < text.length; i++) {
      element.textContent += text[i];
      await new Promise(resolve => setTimeout(resolve, speed));
    }
  }
};

// CSS для анимаций (добавить в styles.css)
const animationStyles = `
@keyframes confettiFall {
  to {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-10px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(10px);
  }
}
`;