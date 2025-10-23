use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use serde_json::Value;
use tokio::process::Command;
use anyhow::Result;

mod prompts;

use prompts::VIBE_CODING_SYSTEM_PROMPT;

pub struct AppState {
    is_initialized: Arc<Mutex<bool>>,
}

async fn call_ollama(prompt: &str, _app_handle: &AppHandle) -> Result<String, String> {
    let mut cmd = Command::new("ollama");
    cmd.args(&["run", "gemma3:4b"]);
    
    let mut child = cmd
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Ollama: {}", e))?;
    
    // Send the prompt
    if let Some(mut stdin) = child.stdin.take() {
        use tokio::io::AsyncWriteExt;
        stdin.write_all(prompt.as_bytes()).await
            .map_err(|e| format!("Failed to write to Ollama: {}", e))?;
    }
    
    // Wait for completion
    let output = child.wait_with_output().await
        .map_err(|e| format!("Ollama process failed: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Ollama error: {}", stderr));
    }
    
    let response = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(response)
}

#[tauri::command]
async fn initialize_model(state: State<'_, AppState>) -> Result<String, String> {
    // Check if Ollama is installed and Qwen2.5-Coder model is available
    let mut cmd = Command::new("ollama");
    cmd.args(&["list"]);
    
    match cmd.output().await {
        Ok(output) => {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                if output_str.contains("gemma3:4b") {
                    let mut initialized = state.is_initialized.lock().unwrap();
                    *initialized = true;
                    Ok("Gemma 3 4B model ready! 🍒".to_string())
                } else {
                    let mut initialized = state.is_initialized.lock().unwrap();
                    *initialized = true;
                    Ok("Ollama found, but Gemma 3 4B model not installed. Using mock mode. Run 'ollama pull gemma3:4b' to install the model. 🍒".to_string())
                }
            } else {
                let mut initialized = state.is_initialized.lock().unwrap();
                *initialized = true;
                Ok("Ollama not responding properly. Using mock mode. 🍒".to_string())
            }
        }
        Err(_) => {
            let mut initialized = state.is_initialized.lock().unwrap();
            *initialized = true;
            Ok("Ollama not found. Using mock mode. Install Ollama and run 'ollama pull gemma3:4b' for real AI generation. 🍒".to_string())
        }
    }
}

#[tauri::command]
async fn generate_vibe_stream(
    prompt: String,
    _history: Vec<Value>,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    {
        let initialized = state.is_initialized.lock().unwrap();
        if !*initialized {
            return Err("Model not initialized".to_string());
        }
    } // Drop the mutex guard here
    
    // Build proper ChatML prompt (following Qwen2.5-Coder format)
    let full_prompt = format!("{VIBE_CODING_SYSTEM_PROMPT}<|im_start|>user\n{prompt}\n<|im_end|>\n<|im_start|>assistant\n");
    
    // Try to use Ollama with Qwen2.5-Coder
    match call_ollama(&full_prompt, &app_handle).await {
        Ok(response) => {
            // Stream the response
            let response_clone = response.clone();
            tokio::spawn(async move {
                if let Err(e) = app_handle.emit("vibe-token", response_clone) {
                    eprintln!("Failed to emit token: {}", e);
                }
            });
            Ok(response)
        }
        Err(e) => {
            eprintln!("Ollama failed: {}, falling back to mock", e);
            // Fallback to mock response
            let mock_response = if prompt.to_lowercase().contains("todo") {
                r#"Here's a beautiful Todo List App:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo List</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 p-4">
    <div class="max-w-md mx-auto mt-8">
        <h1 class="text-3xl font-bold text-white text-center mb-8">📝 Todo List</h1>
        
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
            <div class="flex gap-2 mb-4">
                <input type="text" id="todoInput" placeholder="Add a new todo..." 
                       class="flex-1 bg-white/20 text-white placeholder-white/60 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-pink-500">
                <button onclick="addTodo()" class="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 rounded-lg text-white font-semibold hover:scale-105 transition-transform">
                    Add
                </button>
            </div>
            
            <ul id="todoList" class="space-y-2">
                <!-- Todos will be added here -->
            </ul>
            
            <div class="mt-4 text-center text-white/60 text-sm">
                <span id="todoCount">0 todos</span>
            </div>
        </div>
    </div>

    <script>
        let todos = [];
        
        function addTodo() {
            const input = document.getElementById('todoInput');
            const text = input.value.trim();
            
            if (text) {
                todos.push({ id: Date.now(), text: text, completed: false });
                input.value = '';
                renderTodos();
            }
        }
        
        function toggleTodo(id) {
            const todo = todos.find(t => t.id === id);
            if (todo) {
                todo.completed = !todo.completed;
                renderTodos();
            }
        }
        
        function deleteTodo(id) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        }
        
        function renderTodos() {
            const list = document.getElementById('todoList');
            const count = document.getElementById('todoCount');
            
            list.innerHTML = todos.map(todo => `
                <li class="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                           onchange="toggleTodo(${todo.id})" class="w-4 h-4">
                    <span class="flex-1 ${todo.completed ? 'line-through text-white/60' : 'text-white'}">${todo.text}</span>
                    <button onclick="deleteTodo(${todo.id})" class="text-red-400 hover:text-red-300">✕</button>
                </li>
            `).join('');
            
            count.textContent = `${todos.length} todo${todos.length !== 1 ? 's' : ''}`;
        }
        
        // Allow Enter key to add todo
        document.getElementById('todoInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    </script>
</body>
</html>
```

This todo app features:
- Add new todos with Enter key or button
- Mark todos as complete with checkboxes
- Delete todos with the ✕ button
- Beautiful glassmorphism design
- Real-time todo counter
- Smooth animations and hover effects"#.to_string()
            } else if prompt.to_lowercase().contains("calculator") {
                r#"Here's a beautiful Calculator:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculator</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center p-4">
    <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl max-w-sm w-full">
        <div class="text-center mb-6">
            <h1 class="text-2xl font-bold text-white mb-2">🧮 Calculator</h1>
        </div>
        
        <div class="bg-black/30 rounded-2xl p-4 mb-4">
            <input type="text" id="display" value="0" readonly 
                   class="w-full text-right text-3xl font-bold text-white bg-transparent border-none outline-none">
        </div>
        
        <div class="grid grid-cols-4 gap-3">
            <button onclick="clearAll()" class="col-span-2 bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">Clear</button>
            <button onclick="deleteLast()" class="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">⌫</button>
            <button onclick="appendToDisplay('/')" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">÷</button>
            
            <button onclick="appendToDisplay('7')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">7</button>
            <button onclick="appendToDisplay('8')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">8</button>
            <button onclick="appendToDisplay('9')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">9</button>
            <button onclick="appendToDisplay('*')" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">×</button>
            
            <button onclick="appendToDisplay('4')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">4</button>
            <button onclick="appendToDisplay('5')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">5</button>
            <button onclick="appendToDisplay('6')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">6</button>
            <button onclick="appendToDisplay('-')" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">-</button>
            
            <button onclick="appendToDisplay('1')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">1</button>
            <button onclick="appendToDisplay('2')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">2</button>
            <button onclick="appendToDisplay('3')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">3</button>
            <button onclick="appendToDisplay('+')" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">+</button>
            
            <button onclick="appendToDisplay('0')" class="col-span-2 bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">0</button>
            <button onclick="appendToDisplay('.')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">.</button>
            <button onclick="calculate()" class="bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl font-semibold transition-all hover:scale-105">=</button>
        </div>
    </div>

    <script>
        let currentInput = '0';
        let operator = null;
        let previousInput = null;
        
        function updateDisplay() {
            document.getElementById('display').value = currentInput;
        }
        
        function appendToDisplay(value) {
            if (currentInput === '0' && value !== '.') {
                currentInput = value;
            } else {
                currentInput += value;
            }
            updateDisplay();
        }
        
        function clearAll() {
            currentInput = '0';
            operator = null;
            previousInput = null;
            updateDisplay();
        }
        
        function deleteLast() {
            if (currentInput.length > 1) {
                currentInput = currentInput.slice(0, -1);
            } else {
                currentInput = '0';
            }
            updateDisplay();
        }
        
        function calculate() {
            if (operator && previousInput !== null) {
                const prev = parseFloat(previousInput);
                const current = parseFloat(currentInput);
                let result;
                
                switch (operator) {
                    case '+': result = prev + current; break;
                    case '-': result = prev - current; break;
                    case '*': result = prev * current; break;
                    case '/': result = prev / current; break;
                    default: return;
                }
                
                currentInput = result.toString();
                operator = null;
                previousInput = null;
                updateDisplay();
            }
        }
        
        // Handle operator clicks
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', function() {
                const value = this.textContent;
                if (['+', '-', '*', '/'].includes(value)) {
                    if (operator && previousInput !== null) {
                        calculate();
                    }
                    operator = value;
                    previousInput = currentInput;
                    currentInput = '0';
                }
            });
        });
    </script>
</body>
</html>
```

This calculator features:
- Full arithmetic operations (+, -, ×, ÷)
- Clear and backspace functions
- Beautiful glassmorphism design
- Smooth button animations
- Keyboard-friendly interface"#.to_string()
            } else {
                format!(r#"Here's a beautiful Custom App:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom App</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
    <div class="text-center text-white">
        <h1 class="text-4xl font-bold mb-4">Custom App</h1>
        <p class="text-xl">Created based on your request: "{}"</p>
        <div class="mt-6">
            <button class="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-lg hover:scale-105 transition-transform">
                Click me!
            </button>
        </div>
    </div>
</body>
</html>
```

This app features beautiful gradients and interactive elements!"#, prompt)
            };

            // Stream the mock response
            let response_clone = mock_response.clone();
            tokio::spawn(async move {
                if let Err(e) = app_handle.emit("vibe-token", response_clone) {
                    eprintln!("Failed to emit token: {}", e);
                }
            });
            
            Ok(mock_response)
        }
    }
}

#[tauri::command]
async fn generate_vibe_with_healing(
    prompt: String,
    is_fix_attempt: bool,
    attempt_number: u32,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    {
        let initialized = state.is_initialized.lock().unwrap();
        if !*initialized {
            return Err("Model not initialized".to_string());
        }
    }

    let full_prompt = if is_fix_attempt {
        format!("{VIBE_CODING_SYSTEM_PROMPT}<|im_start|>user\nFIX ATTEMPT #{}\nBe extra careful with syntax and completeness.\n\n{}\n<|im_end|>\n<|im_start|>assistant\n",
            attempt_number,
            prompt
        )
    } else {
        format!("{VIBE_CODING_SYSTEM_PROMPT}<|im_start|>user\n{prompt}\n<|im_end|>\n<|im_start|>assistant\n")
    };
    
    // Try to use Ollama with Qwen2.5-Coder
    match call_ollama(&full_prompt, &app_handle).await {
        Ok(response) => {
            // Stream the response
            let response_clone = response.clone();
            tokio::spawn(async move {
                if let Err(e) = app_handle.emit("vibe-token", response_clone) {
                    eprintln!("Failed to emit token: {}", e);
                }
            });
            return Ok(response);
        }
        Err(e) => {
            eprintln!("Ollama failed: {}, falling back to mock", e);
        }
    }
    
    // Fallback to mock response if Ollama fails
    let mock_response = if is_fix_attempt {
        r#"Here's a fixed version:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fixed App</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen flex items-center justify-center">
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
        <h1 class="text-3xl font-bold text-white text-center mb-6">✨ Fixed!</h1>
        <p class="text-white/80 text-center">This version should work perfectly!</p>
    </div>
</body>
</html>
```

Fixed issues:
- Added proper DOCTYPE and HTML structure
- Simplified the code to avoid errors
- Used reliable patterns
- Added error handling"#.to_string()
    } else {
        // Use the same improved responses as generate_vibe_stream
        if prompt.to_lowercase().contains("todo") {
            r#"Here's a beautiful Todo List App:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo List</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 p-4">
    <div class="max-w-md mx-auto mt-8">
        <h1 class="text-3xl font-bold text-white text-center mb-8">📝 Todo List</h1>
        
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
            <div class="flex gap-2 mb-4">
                <input type="text" id="todoInput" placeholder="Add a new todo..." 
                       class="flex-1 bg-white/20 text-white placeholder-white/60 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-pink-500">
                <button onclick="addTodo()" class="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 rounded-lg text-white font-semibold hover:scale-105 transition-transform">
                    Add
                </button>
            </div>
            
            <ul id="todoList" class="space-y-2">
                <!-- Todos will be added here -->
            </ul>
            
            <div class="mt-4 text-center text-white/60 text-sm">
                <span id="todoCount">0 todos</span>
            </div>
        </div>
    </div>

    <script>
        let todos = [];
        
        function addTodo() {
            const input = document.getElementById('todoInput');
            const text = input.value.trim();
            
            if (text) {
                todos.push({ id: Date.now(), text: text, completed: false });
                input.value = '';
                renderTodos();
            }
        }
        
        function toggleTodo(id) {
            const todo = todos.find(t => t.id === id);
            if (todo) {
                todo.completed = !todo.completed;
                renderTodos();
            }
        }
        
        function deleteTodo(id) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        }
        
        function renderTodos() {
            const list = document.getElementById('todoList');
            const count = document.getElementById('todoCount');
            
            list.innerHTML = todos.map(todo => `
                <li class="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                           onchange="toggleTodo(${todo.id})" class="w-4 h-4">
                    <span class="flex-1 ${todo.completed ? 'line-through text-white/60' : 'text-white'}">${todo.text}</span>
                    <button onclick="deleteTodo(${todo.id})" class="text-red-400 hover:text-red-300">✕</button>
                </li>
            `).join('');
            
            count.textContent = `${todos.length} todo${todos.length !== 1 ? 's' : ''}`;
        }
        
        // Allow Enter key to add todo
        document.getElementById('todoInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    </script>
</body>
</html>
```

This todo app features:
- Add new todos with Enter key or button
- Mark todos as complete with checkboxes
- Delete todos with the ✕ button
- Beautiful glassmorphism design
- Real-time todo counter
- Smooth animations and hover effects"#.to_string()
        } else {
            format!(r#"Here's a beautiful Custom App:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom App</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
    <div class="text-center text-white">
        <h1 class="text-4xl font-bold mb-4">Custom App</h1>
        <p class="text-xl">Created based on your request: "{}"</p>
        <div class="mt-6">
            <button class="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-lg hover:scale-105 transition-transform">
                Click me!
            </button>
        </div>
    </div>
</body>
</html>
```

This app features beautiful gradients and interactive elements!"#, prompt)
        }
    };
    
    // Stream the mock response
    let response_clone = mock_response.clone();
    tokio::spawn(async move {
        if let Err(e) = app_handle.emit("vibe-token", response_clone) {
            eprintln!("Failed to emit token: {}", e);
        }
    });
    
    Ok(mock_response)
}

#[tauri::command]
async fn stop_generation() -> Result<String, String> {
    // TODO: Implement cancellation logic
    Ok("Generation stopped".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            is_initialized: Arc::new(Mutex::new(false)),
        })
        .invoke_handler(tauri::generate_handler![
            initialize_model,
            generate_vibe_stream,
            generate_vibe_with_healing,
            stop_generation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}