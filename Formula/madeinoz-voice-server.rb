# frozen_string_literal: true

class MadeinozVoiceServer < Formula
  desc "Local-first TTS voice server using Kokoro-82M and Qwen TTS models"
  homepage "https://github.com/madeinoz67/madeinoz-voice-server"
  version "0.1.0"
  license "MIT"

  depends_on "bun"
  depends_on "ffmpeg"

  # Install from git head (no releases yet)
  head "https://github.com/madeinoz67/madeinoz-voice-server.git", branch: "main"

  def install
    # Install source files to share directory
    share.install Dir["*"]

    # Create wrapper script
    (bin/"voice-server").write <<~EOS
      #!/bin/bash
      # Wrapper script for madeinoz-voice-server

      SERVER_DIR="#{HOMEBREW_PREFIX}/share/madeinoz-voice-server"
      export PORT="${PORT:-8888}"
      export TTS_BACKEND="${TTS_BACKEND:-mlx}"
      export ENABLE_MACOS_NOTIFICATIONS="${ENABLE_MACOS_NOTIFICATIONS:-true}"

      cd "$SERVER_DIR" || exit 1

      # Install dependencies if needed
      if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        bun install
      fi

      # Run the server
      exec bun run src/ts/server.ts "$@"
    EOS

    # Make wrapper executable
    chmod 0755, bin/"voice-server"

    # Create launchd plist for brew services
    (prefix/"homebrew.mxcl.voice-server.plist").write <<~EOS
      <?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
      <plist version="1.0">
      <dict>
        <key>Label</key>
        <string>homebrew.mxcl.voice-server</string>
        <key>ProgramArguments</key>
        <array>
          <string>#{bin}/voice-server</string>
        </array>
        <key>RunAtLoad</key>
        <true/>
        <key>KeepAlive</key>
        <true/>
        <key>StandardOutPath</key>
        <string>#{var}/log/voice-server.log</string>
        <key>StandardErrorPath</key>
        <string>#{var}/log/voice-server.log</string>
        <key>EnvironmentVariables</key>
        <dict>
          <key>PORT</key>
          <string>8888</string>
          <key>TTS_BACKEND</key>
          <string>mlx</string>
        </dict>
      </dict>
      </plist>
      EOS
  end

  def post_install
    # Install dependencies after installation
    system "bun", "install", chdir: "#{HOMEBREW_PREFIX}/share/madeinoz-voice-server"

    # Check for MLX-audio (optional backend)
    mlx_check = `which mlx-audio 2>/dev/null`.strip
    if mlx_check.empty?
      ohai "MLX-audio backend not found. To install:"
      ohai "  uv tool install mlx-audio"
      ohai "Or use Qwen backend:"
      ohai "  TTS_BACKEND=qwen voice-server"
    end
  end

  test do
    # Test that the wrapper script exists and is executable
    assert_predicate bin/"voice-server", :exist?
    assert_predicate bin/"voice-server", :executable?

    # Test that the source directory was installed
    assert_predicate HOMEBREW_PREFIX/"share/madeinoz-voice-server/src/ts/server.ts", :exist?
  end

  service do
    run [bin/"voice-server"]
    keep_alive true
    log_path var/"log/voice-server.log"
    error_log_path var/"log/voice-server.log"
    environment_variables PORT: "8888", TTS_BACKEND: "mlx"
  end
end
