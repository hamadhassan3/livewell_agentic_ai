import os
from typing import Dict, Any, Optional
import requests
from django.contrib.auth import get_user_model
from .base import ServerTool

User = get_user_model()


class GetWeatherTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="get_weather",
            description="Get current weather for a given location"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The location to get weather for (e.g., 'New York, NY' or 'London, UK')"
                },
                "units": {
                    "type": "string",
                    "enum": ["metric", "imperial", "kelvin"],
                    "description": "Temperature units",
                    "default": "metric"
                }
            },
            "required": ["location"]
        }
    
    def execute(self, location: str, units: str = "metric", **kwargs) -> Dict[str, Any]:
        try:
            # Check for OpenWeatherMap API key
            api_key = os.getenv('OPENWEATHER_API_KEY')
            
            if not api_key:
                # Return mock data if no API key
                return self._get_mock_weather(location, units)
            
            # Call actual OpenWeatherMap API
            url = os.getenv('OPENWEATHER_URL')
            params = {
                "q": location,
                "appid": api_key,
                "units": units
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            return {
                "location": f"{data['name']}, {data['sys']['country']}",
                "temperature": f"{data['main']['temp']}°{self._get_unit_symbol(units)}",
                "condition": data['weather'][0]['description'].title(),
                "humidity": f"{data['main']['humidity']}%",
                "feels_like": f"{data['main']['feels_like']}°{self._get_unit_symbol(units)}",
                "pressure": f"{data['main']['pressure']} hPa"
            }
            
        except requests.RequestException as e:
            return {"error": f"Weather API request failed: {str(e)}"}
        except KeyError as e:
            return {"error": f"Invalid weather data received: {str(e)}"}
        except Exception as e:
            return {"error": f"Failed to get weather: {str(e)}"}
    
    def _get_mock_weather(self, location: str, units: str) -> Dict[str, Any]:
        """Return mock weather data when API key is not available"""
        temp_unit = self._get_unit_symbol(units)
        mock_temp = "22" if units == "metric" else "72" if units == "imperial" else "295"
        
        return {
            "location": location,
            "temperature": f"{mock_temp}°{temp_unit}",
            "condition": "Partly Cloudy",
            "humidity": "65%",
            "feels_like": f"{int(mock_temp) + 2}°{temp_unit}",
            "pressure": "1013 hPa",
            "note": "Mock data - Set OPENWEATHER_API_KEY environment variable for real data"
        }
    
    def _get_unit_symbol(self, units: str) -> str:
        """Get temperature unit symbol"""
        unit_map = {
            "metric": "C",
            "imperial": "F", 
            "kelvin": "K"
        }
        return unit_map.get(units, "C")


class CalculatorTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="calculator",
            description="Perform basic mathematical calculations safely"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate (supports +, -, *, /, **, (), numbers and basic functions like sqrt, sin, cos, log)"
                }
            },
            "required": ["expression"]
        }
    
    def execute(self, expression: str, **kwargs) -> Dict[str, Any]:
        try:
            # Sanitize and validate expression
            sanitized_expr = self._sanitize_expression(expression.strip())
            
            if not sanitized_expr:
                return {"error": "Empty or invalid expression"}
            
            # Use restricted evaluation for safety
            result = self._safe_eval(sanitized_expr)
            
            return {
                "expression": expression,
                "result": result,
                "formatted_result": self._format_result(result)
            }
            
        except ZeroDivisionError:
            return {"error": "Division by zero"}
        except ValueError as e:
            return {"error": f"Invalid mathematical operation: {str(e)}"}
        except Exception as e:
            return {"error": f"Calculation failed: {str(e)}"}
    
    def _sanitize_expression(self, expression: str) -> str:
        """Sanitize mathematical expression for safe evaluation"""
        import re
        
        # Remove whitespace
        expr = re.sub(r'\s+', '', expression)
        
        # Allow only safe characters and functions
        allowed_pattern = r'^[0-9+\-*/.()^**sqrtsincostalogelnpi]+$'
        if not re.match(allowed_pattern, expr, re.IGNORECASE):
            raise ValueError("Expression contains invalid characters")
        
        # Replace common math notation
        expr = expr.replace('^', '**')  # Power operator
        expr = expr.replace('pi', str(3.14159265359))
        expr = expr.replace('e', str(2.71828182846))
        
        return expr
    
    def _safe_eval(self, expression: str) -> float:
        """Safely evaluate mathematical expression"""
        import math
        import ast
        import operator
        
        # Define safe operations
        safe_operators = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.Pow: operator.pow,
            ast.USub: operator.neg,
            ast.UAdd: operator.pos,
        }
        
        # Define safe functions
        safe_functions = {
            'sqrt': math.sqrt,
            'sin': math.sin,
            'cos': math.cos,
            'tan': math.tan,
            'log': math.log10,
            'ln': math.log,
            'abs': abs,
            'round': round,
            'floor': math.floor,
            'ceil': math.ceil,
        }
        
        def _eval_node(node):
            if isinstance(node, ast.Constant):
                return node.value
            elif isinstance(node, ast.Num):  # For older Python versions
                return node.n
            elif isinstance(node, ast.BinOp):
                left = _eval_node(node.left)
                right = _eval_node(node.right)
                op = safe_operators.get(type(node.op))
                if op:
                    return op(left, right)
                else:
                    raise ValueError(f"Unsupported operation: {type(node.op)}")
            elif isinstance(node, ast.UnaryOp):
                operand = _eval_node(node.operand)
                op = safe_operators.get(type(node.op))
                if op:
                    return op(operand)
                else:
                    raise ValueError(f"Unsupported unary operation: {type(node.op)}")
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id in safe_functions:
                    args = [_eval_node(arg) for arg in node.args]
                    return safe_functions[node.func.id](*args)
                else:
                    raise ValueError(f"Unsupported function call")
            else:
                raise ValueError(f"Unsupported node type: {type(node)}")
        
        try:
            # Parse the expression into an AST
            tree = ast.parse(expression, mode='eval')
            return _eval_node(tree.body)
        except (SyntaxError, ValueError) as e:
            # Fallback to simple eval with restricted scope
            return self._fallback_eval(expression)
    
    def _fallback_eval(self, expression: str) -> float:
        """Fallback evaluation for simple expressions"""
        import math
        
        # Very restricted safe scope
        safe_dict = {
            '__builtins__': {},
            'abs': abs,
            'round': round,
            'pow': pow,
            'sqrt': math.sqrt,
            'sin': math.sin,
            'cos': math.cos,
            'tan': math.tan,
            'log': math.log10,
            'ln': math.log,
        }
        
        return eval(expression, safe_dict, {})
    
    def _format_result(self, result: float) -> str:
        """Format the result for display"""
        if isinstance(result, float):
            if result.is_integer():
                return str(int(result))
            else:
                # Round to 10 decimal places to avoid floating point issues
                return f"{result:.10g}"
        return str(result)


class UpdateUserProfileTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="update_user_profile",
            description="Update the current user's profile information"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user to update"
                },
                "name": {
                    "type": "string",
                    "description": "The user's full name"
                },
                "gender": {
                    "type": "string",
                    "enum": ["M", "F", "O"],
                    "description": "Gender (M: Male, F: Female, O: Other)"
                },
                "date_of_birth": {
                    "type": "string",
                    "format": "date",
                    "description": "Date of birth in YYYY-MM-DD format"
                },
                "height": {
                    "type": "number",
                    "description": "Height in centimeters"
                },
                "weight": {
                    "type": "number",
                    "description": "Weight in kilograms"
                }
            },
            "required": ["user_id"]
        }
    
    def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        try:
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Update user fields if provided
            updated_fields = []
            
            if "name" in kwargs:
                user.name = kwargs["name"]
                updated_fields.append("name")
            
            if "gender" in kwargs:
                if kwargs["gender"] not in ["M", "F", "O"]:
                    return {"error": "Invalid gender. Must be 'M', 'F', or 'O'"}
                user.gender = kwargs["gender"]
                updated_fields.append("gender")
            
            if "date_of_birth" in kwargs:
                from datetime import datetime
                try:
                    # Parse the date string
                    date_of_birth = datetime.strptime(kwargs["date_of_birth"], "%Y-%m-%d").date()
                    user.date_of_birth = date_of_birth
                    updated_fields.append("date_of_birth")
                except ValueError:
                    return {"error": "Invalid date format. Use YYYY-MM-DD"}
            
            if "height" in kwargs:
                try:
                    height = float(kwargs["height"])
                    if height <= 0:
                        return {"error": "Height must be a positive number"}
                    user.height = height
                    updated_fields.append("height")
                except (ValueError, TypeError):
                    return {"error": "Invalid height value"}
            
            if "weight" in kwargs:
                try:
                    weight = float(kwargs["weight"])
                    if weight <= 0:
                        return {"error": "Weight must be a positive number"}
                    user.weight = weight
                    updated_fields.append("weight")
                except (ValueError, TypeError):
                    return {"error": "Invalid weight value"}
            
            if not updated_fields:
                return {"error": "No fields to update. Provide at least one field to update."}
            
            # Save the user
            user.save()
            
            # Calculate age and BMI for the response
            age = None
            if user.date_of_birth:
                from datetime import date
                today = date.today()
                age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
            
            bmi = None
            if user.height and user.weight:
                height_m = float(user.height) / 100
                bmi = round(float(user.weight) / (height_m ** 2), 2)
            
            return {
                "success": True,
                "message": f"User profile updated successfully",
                "updated_fields": updated_fields,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "gender": user.gender,
                    "date_of_birth": str(user.date_of_birth) if user.date_of_birth else None,
                    "height": float(user.height) if user.height else None,
                    "weight": float(user.weight) if user.weight else None,
                    "age": age,
                    "bmi": bmi
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to update user profile: {str(e)}"}


class RecordMedicationTakenTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="record_medication_taken",
            description="Record that a medication has been taken by the user"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user recording the medication"
                },
                "medication_id": {
                    "type": "integer",
                    "description": "The ID of the medication that was taken"
                },
                "scheduled_time": {
                    "type": "string",
                    "enum": ["morning", "noon", "evening", "bedtime"],
                    "description": "The scheduled time when the medication was taken (optional)"
                },
                "notes": {
                    "type": "string",
                    "description": "Optional notes about taking this medication"
                }
            },
            "required": ["user_id", "medication_id"]
        }
    
    def execute(self, user_id: int, medication_id: int, scheduled_time: Optional[str] = None, notes: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        try:
            from tracking.models import Medication, MedicationTaken
            from datetime import date
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Get the medication
            try:
                medication = Medication.objects.get(id=medication_id, user=user)
            except Medication.DoesNotExist:
                return {"error": f"Medication with ID {medication_id} not found for this user"}
            
            # Check if already taken today for this scheduled time
            today = date.today()
            existing = MedicationTaken.objects.filter(
                medication=medication,
                user=user,
                date_taken=today,
                scheduled_time=scheduled_time
            ).first()
            
            if existing:
                return {
                    "error": f"Medication already recorded as taken today{f' for {scheduled_time}' if scheduled_time else ''}",
                    "existing_record": {
                        "id": existing.id,
                        "taken_at": existing.taken_at.isoformat(),
                        "notes": existing.notes
                    }
                }
            
            # Create the medication taken record
            taken_record = MedicationTaken.objects.create(
                medication=medication,
                user=user,
                scheduled_time=scheduled_time,
                notes=notes or ""
            )
            
            return {
                "success": True,
                "message": f"Medication '{medication.name}' recorded as taken",
                "record": {
                    "id": taken_record.id,
                    "medication_id": medication.id,
                    "medication_name": medication.name,
                    "taken_at": taken_record.taken_at.isoformat(),
                    "date_taken": str(taken_record.date_taken),
                    "scheduled_time": taken_record.scheduled_time,
                    "notes": taken_record.notes
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to record medication taken: {str(e)}"}


class GetMedicationHistoryTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="get_medication_history",
            description="Get medication taken history for a user"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user to get medication history for"
                },
                "medication_id": {
                    "type": "integer",
                    "description": "Optional: Filter by specific medication ID"
                },
                "days": {
                    "type": "integer",
                    "description": "Number of days of history to retrieve (default: 7, max: 30)"
                }
            },
            "required": ["user_id"]
        }
    
    def execute(self, user_id: int, medication_id: Optional[int] = None, days: int = 7, **kwargs) -> Dict[str, Any]:
        try:
            from tracking.models import MedicationTaken
            from datetime import date, timedelta
            
            # Validate days parameter
            days = min(max(days, 1), 30)  # Between 1 and 30 days
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Calculate date range
            end_date = date.today()
            start_date = end_date - timedelta(days=days-1)
            
            # Build query
            query = MedicationTaken.objects.filter(
                user=user,
                date_taken__gte=start_date,
                date_taken__lte=end_date
            )
            
            if medication_id:
                query = query.filter(medication_id=medication_id)
            
            # Get records
            records = query.select_related('medication').order_by('-taken_at')
            
            # Format results
            history = []
            for record in records:
                history.append({
                    "id": record.id,
                    "medication_id": record.medication.id,
                    "medication_name": record.medication.name,
                    "taken_at": record.taken_at.isoformat(),
                    "date_taken": str(record.date_taken),
                    "scheduled_time": record.scheduled_time,
                    "notes": record.notes
                })
            
            return {
                "success": True,
                "user_id": user_id,
                "period": {
                    "start_date": str(start_date),
                    "end_date": str(end_date),
                    "days": days
                },
                "total_records": len(history),
                "history": history
            }
            
        except Exception as e:
            return {"error": f"Failed to get medication history: {str(e)}"}


class RecordGoalCompletedTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="record_goal_completed",
            description="Record that a goal has been completed by the user"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user completing the goal"
                },
                "goal_id": {
                    "type": "integer",
                    "description": "The ID of the goal that was completed"
                },
                "notes": {
                    "type": "string",
                    "description": "Optional notes about completing this goal"
                }
            },
            "required": ["user_id", "goal_id"]
        }
    
    def execute(self, user_id: int, goal_id: int, notes: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        try:
            from tracking.models import Goal, GoalCompleted
            from datetime import date
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Get the goal
            try:
                goal = Goal.objects.get(id=goal_id, user=user)
            except Goal.DoesNotExist:
                return {"error": f"Goal with ID {goal_id} not found for this user"}
            
            # Check if already completed today
            today = date.today()
            existing = GoalCompleted.objects.filter(
                goal=goal,
                user=user,
                date_completed=today
            ).first()
            
            if existing:
                return {
                    "error": f"Goal '{goal.title}' already marked as completed today",
                    "existing_record": {
                        "id": existing.id,
                        "completed_at": existing.completed_at.isoformat(),
                        "notes": existing.notes
                    }
                }
            
            # Create the goal completed record
            completed_record = GoalCompleted.objects.create(
                goal=goal,
                user=user,
                notes=notes or ""
            )
            
            return {
                "success": True,
                "message": f"Goal '{goal.title}' marked as completed",
                "record": {
                    "id": completed_record.id,
                    "goal_id": goal.id,
                    "goal_title": goal.title,
                    "goal_category": goal.category,
                    "completed_at": completed_record.completed_at.isoformat(),
                    "date_completed": str(completed_record.date_completed),
                    "notes": completed_record.notes
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to record goal completion: {str(e)}"}


class GetGoalProgressTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="get_goal_progress",
            description="Get goal completion progress for a user"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user to get goal progress for"
                },
                "goal_id": {
                    "type": "integer",
                    "description": "Optional: Filter by specific goal ID"
                },
                "days": {
                    "type": "integer",
                    "description": "Number of days of progress to retrieve (default: 7, max: 30)"
                }
            },
            "required": ["user_id"]
        }
    
    def execute(self, user_id: int, goal_id: Optional[int] = None, days: int = 7, **kwargs) -> Dict[str, Any]:
        try:
            from tracking.models import Goal, GoalCompleted
            from datetime import date, timedelta
            
            # Validate days parameter
            days = min(max(days, 1), 30)  # Between 1 and 30 days
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Calculate date range
            end_date = date.today()
            start_date = end_date - timedelta(days=days-1)
            
            # Get user's goals
            goals_query = Goal.objects.filter(user=user, is_active=True)
            if goal_id:
                goals_query = goals_query.filter(id=goal_id)
            
            goals = goals_query.all()
            
            if not goals:
                return {
                    "success": True,
                    "message": "No active goals found",
                    "user_id": user_id,
                    "progress": []
                }
            
            # Get completion records
            progress = []
            for goal in goals:
                completed_records = GoalCompleted.objects.filter(
                    goal=goal,
                    user=user,
                    date_completed__gte=start_date,
                    date_completed__lte=end_date
                ).order_by('-completed_at')
                
                # Calculate completion rate based on frequency
                expected_completions = 0
                if goal.frequency == 'daily':
                    expected_completions = days
                elif goal.frequency == 'weekly':
                    expected_completions = max(1, days // 7)
                elif goal.frequency == 'fortnightly':
                    expected_completions = max(1, days // 14)
                elif goal.frequency == 'monthly':
                    expected_completions = max(1, days // 30)
                
                actual_completions = completed_records.count()
                completion_rate = (actual_completions / expected_completions * 100) if expected_completions > 0 else 0
                
                # Get completion history
                completion_history = []
                for record in completed_records:
                    completion_history.append({
                        "id": record.id,
                        "completed_at": record.completed_at.isoformat(),
                        "date_completed": str(record.date_completed),
                        "notes": record.notes
                    })
                
                progress.append({
                    "goal_id": goal.id,
                    "goal_title": goal.title,
                    "category": goal.category,
                    "frequency": goal.frequency,
                    "expected_completions": expected_completions,
                    "actual_completions": actual_completions,
                    "completion_rate": round(completion_rate, 1),
                    "completions": completion_history
                })
            
            return {
                "success": True,
                "user_id": user_id,
                "period": {
                    "start_date": str(start_date),
                    "end_date": str(end_date),
                    "days": days
                },
                "total_goals": len(progress),
                "progress": progress
            }
            
        except Exception as e:
            return {"error": f"Failed to get goal progress: {str(e)}"}


class WebSearchTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="web_search",
            description="Search the web using Google Custom Search API"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to search for on the web"
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of search results to return (default: 5, max: 10)",
                    "default": 5
                },
                "search_type": {
                    "type": "string",
                    "enum": ["web", "image"],
                    "description": "Type of search to perform (web or image)",
                    "default": "web"
                }
            },
            "required": ["query"]
        }
    
    def execute(self, query: str, num_results: int = 5, search_type: str = "web", **kwargs) -> Dict[str, Any]:
        try:
            # Get API credentials from environment
            api_key = os.getenv('GOOGLE_API_KEY_SEARCH')
            search_engine_id = os.getenv('GOOGLE_CSE_ID')
            
            if not api_key or not search_engine_id:
                return {
                    "error": "Google Search API not configured",
                    "message": "Please configure GOOGLE_API_KEY and GOOGLE_CSE_ID in .env file"
                }
            
            # Validate and limit num_results
            num_results = min(max(num_results, 1), 10)
            
            # Build the Google Custom Search API URL
            url = "https://www.googleapis.com/customsearch/v1"
            
            params = {
                "key": api_key,
                "cx": search_engine_id,
                "q": query,
                "num": num_results
            }
            
            # Add search type parameter if it's an image search
            if search_type == "image":
                params["searchType"] = "image"
            
            # Make the API request
            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                error_data = response.json()
                return {
                    "error": f"Google Search API error: {error_data.get('error', {}).get('message', 'Unknown error')}",
                    "status_code": response.status_code
                }
            
            data = response.json()
            
            # Extract relevant information from search results
            results = []
            items = data.get('items', [])
            
            for item in items:
                if search_type == "image":
                    result = {
                        "title": item.get('title', ''),
                        "link": item.get('link', ''),
                        "thumbnail": item.get('image', {}).get('thumbnailLink', ''),
                        "context_link": item.get('image', {}).get('contextLink', ''),
                        "height": item.get('image', {}).get('height'),
                        "width": item.get('image', {}).get('width')
                    }
                else:
                    result = {
                        "title": item.get('title', ''),
                        "link": item.get('link', ''),
                        "snippet": item.get('snippet', ''),
                        "display_link": item.get('displayLink', '')
                    }
                results.append(result)
            
            # Get search information
            search_info = data.get('searchInformation', {})
            
            return {
                "success": True,
                "query": query,
                "total_results": search_info.get('formattedTotalResults', 'Unknown'),
                "search_time": search_info.get('formattedSearchTime', 'Unknown'),
                "num_results": len(results),
                "search_type": search_type,
                "results": results
            }
            
        except requests.RequestException as e:
            return {"error": f"Failed to perform web search: {str(e)}"}


class ScheduleNotificationTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="schedule_notification",
            description="Schedule a notification to be sent to the user at a specific time"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user to receive the notification"
                },
                "title": {
                    "type": "string",
                    "description": "The title of the notification"
                },
                "body": {
                    "type": "string", 
                    "description": "The body/content of the notification"
                },
                "scheduled_time": {
                    "type": "string",
                    "format": "date-time",
                    "description": "When to send the notification (ISO 8601 format: YYYY-MM-DDTHH:MM:SS)"
                },
                "notification_type": {
                    "type": "string",
                    "enum": ["reminder", "alert", "info"],
                    "description": "Type of notification",
                    "default": "reminder"
                },
                "frequency": {
                    "type": "string",
                    "enum": ["once", "daily", "weekly", "monthly"],
                    "description": "How often to repeat the notification",
                    "default": "once"
                },
                "data": {
                    "type": "object",
                    "description": "Additional data to include with the notification",
                    "default": {}
                }
            },
            "required": ["user_id", "title", "body", "scheduled_time"]
        }
    
    def execute(self, user_id: int, title: str, body: str, scheduled_time: str, 
                notification_type: str = "reminder", frequency: str = "once", 
                data: Optional[Dict[str, Any]] = None, **kwargs) -> Dict[str, Any]:
        try:
            from notification.models import ScheduledNotification
            from datetime import datetime
            from django.utils import timezone
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Parse the scheduled time
            try:
                # Try to parse ISO format datetime
                if 'T' in scheduled_time:
                    scheduled_dt = datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
                else:
                    # If no time specified, assume midnight
                    scheduled_dt = datetime.fromisoformat(f"{scheduled_time}T00:00:00")
                
                # Make timezone aware if not already
                if scheduled_dt.tzinfo is None:
                    scheduled_dt = timezone.make_aware(scheduled_dt)
                    
            except ValueError:
                return {"error": f"Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T10:30:00)"}
            
            # Validate scheduled time is in the future
            if scheduled_dt <= timezone.now():
                return {"error": "Scheduled time must be in the future"}
            
            # Validate notification type
            if notification_type not in ["reminder", "alert", "info"]:
                return {"error": "Invalid notification type. Must be 'reminder', 'alert', or 'info'"}
            
            # Validate frequency
            if frequency not in ["once", "daily", "weekly", "monthly"]:
                return {"error": "Invalid frequency. Must be 'once', 'daily', 'weekly', or 'monthly'"}
            
            # Create the scheduled notification
            scheduled_notification = ScheduledNotification.objects.create(
                recipient=user,
                title=title,
                body=body,
                scheduled_time=scheduled_dt,
                notification_type=notification_type,
                frequency=frequency,
                data=data or {},
                status='pending'
            )
            
            # Calculate next send time if recurring
            next_send_time = None
            if frequency != 'once':
                next_send_time = scheduled_notification.calculate_next_send_time()
                if next_send_time:
                    scheduled_notification.next_send_at = next_send_time
                    scheduled_notification.save()
            
            return {
                "success": True,
                "message": f"Notification scheduled successfully",
                "notification": {
                    "id": scheduled_notification.id,
                    "title": scheduled_notification.title,
                    "body": scheduled_notification.body,
                    "scheduled_time": scheduled_notification.scheduled_time.isoformat(),
                    "notification_type": scheduled_notification.notification_type,
                    "frequency": scheduled_notification.frequency,
                    "status": scheduled_notification.status,
                    "next_send_at": next_send_time.isoformat() if next_send_time else None,
                    "recipient": {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name
                    }
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to schedule notification: {str(e)}"}


class UpdateUserPreferencesTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="update_user_preferences",
            description="Update the current user's preferences including health conditions, activity levels, notifications, and other wellness settings"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user to update preferences for"
                },
                # Health conditions
                "is_diabetic": {
                    "type": "boolean",
                    "description": "Whether the user is diabetic"
                },
                "is_hypertensive": {
                    "type": "boolean",
                    "description": "Whether the user has hypertension"
                },
                "has_heart_disease": {
                    "type": "boolean",
                    "description": "Whether the user has heart disease"
                },
                "has_arthritis": {
                    "type": "boolean",
                    "description": "Whether the user has arthritis"
                },
                "has_osteoporosis": {
                    "type": "boolean",
                    "description": "Whether the user has osteoporosis"
                },
                "has_vision_impairment": {
                    "type": "boolean",
                    "description": "Whether the user has vision impairment"
                },
                "has_hearing_impairment": {
                    "type": "boolean",
                    "description": "Whether the user has hearing impairment"
                },
                "has_memory_concerns": {
                    "type": "boolean",
                    "description": "Whether the user has memory concerns"
                },
                "other_health_conditions": {
                    "type": "string",
                    "description": "Other health conditions"
                },
                # Medication
                "takes_medications": {
                    "type": "boolean",
                    "description": "Whether the user takes medications"
                },
                "medication_reminder_enabled": {
                    "type": "boolean",
                    "description": "Whether medication reminders are enabled"
                },
                # Activity and exercise
                "activity_level": {
                    "type": "string",
                    "enum": ["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"],
                    "description": "User's activity level"
                },
                "exercise_goal_minutes_per_week": {
                    "type": "integer",
                    "description": "Weekly exercise goal in minutes"
                },
                "mobility_level": {
                    "type": "string",
                    "enum": ["fully_mobile", "uses_walking_aid", "wheelchair_user", "limited_mobility"],
                    "description": "User's mobility level"
                },
                "needs_transportation_assistance": {
                    "type": "boolean",
                    "description": "Whether user needs transportation assistance"
                },
                # Social preferences
                "social_preference": {
                    "type": "string",
                    "enum": ["very_social", "moderately_social", "occasionally_social", "prefer_solitude"],
                    "description": "User's social preference"
                },
                "interested_in_group_activities": {
                    "type": "boolean",
                    "description": "Interest in group activities"
                },
                # Mental wellness
                "stress_level": {
                    "type": "string",
                    "enum": ["low", "moderate", "high"],
                    "description": "User's stress level"
                },
                "interested_in_mindfulness": {
                    "type": "boolean",
                    "description": "Interest in mindfulness activities"
                },
                "interested_in_meditation": {
                    "type": "boolean",
                    "description": "Interest in meditation"
                },
                # Sleep
                "sleep_quality_rating": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                    "description": "Sleep quality rating (1-10 scale)"
                },
                # Nutrition
                "diet_type": {
                    "type": "string",
                    "enum": ["omnivore", "vegetarian", "vegan", "pescatarian", "mediterranean", "low_sodium", "diabetic_friendly", "other"],
                    "description": "User's diet type"
                },
                "food_allergies": {
                    "type": "string",
                    "description": "Food allergies or dietary restrictions"
                },
                "water_intake_goal_liters": {
                    "type": "number",
                    "minimum": 0.5,
                    "maximum": 10.0,
                    "description": "Daily water intake goal in liters"
                },
                # Technology
                "tech_comfort_level": {
                    "type": "string",
                    "enum": ["very_comfortable", "comfortable", "somewhat_comfortable", "needs_assistance"],
                    "description": "Technology comfort level"
                },
                # Notifications
                "notification_frequency": {
                    "type": "string",
                    "enum": ["none", "daily", "twice_daily", "three_times_daily", "hourly"],
                    "description": "Notification frequency"
                },
                "notification_time_preference": {
                    "type": "string",
                    "enum": ["morning", "afternoon", "evening", "flexible"],
                    "description": "Preferred notification time"
                },
                # Personality and motivation
                "personality_type": {
                    "type": "string",
                    "enum": ["achiever", "explorer", "socializer", "competitor"],
                    "description": "User's personality type"
                },
                "motivation_type": {
                    "type": "string",
                    "enum": ["intrinsic", "extrinsic", "social", "competitive"],
                    "description": "User's motivation type"
                },
                "prefers_short_term_goals": {
                    "type": "boolean",
                    "description": "Preference for short-term goals"
                },
                "prefers_long_term_goals": {
                    "type": "boolean",
                    "description": "Preference for long-term goals"
                },
                "goal_reminder_enabled": {
                    "type": "boolean",
                    "description": "Whether goal reminders are enabled"
                },
                # Emergency contacts
                "emergency_contact_name": {
                    "type": "string",
                    "description": "Emergency contact name"
                },
                "emergency_contact_phone": {
                    "type": "string",
                    "description": "Emergency contact phone number"
                },
                "emergency_contact_relationship": {
                    "type": "string",
                    "description": "Emergency contact relationship"
                }
            },
            "required": ["user_id"]
        }
    
    def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        try:
            from profiles.models import UserPreferences
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Get or create preferences
            preferences, created = UserPreferences.objects.get_or_create(
                user=user,
                defaults={}
            )
            
            # Track which fields are being updated
            updated_fields = []
            
            # Define all valid preference fields
            valid_fields = [
                'is_diabetic', 'is_hypertensive', 'has_heart_disease', 'has_arthritis',
                'has_osteoporosis', 'has_vision_impairment', 'has_hearing_impairment',
                'has_memory_concerns', 'other_health_conditions', 'takes_medications',
                'medication_reminder_enabled', 'activity_level', 'exercise_goal_minutes_per_week',
                'mobility_level', 'needs_transportation_assistance', 'social_preference',
                'interested_in_group_activities', 'stress_level', 'interested_in_mindfulness',
                'interested_in_meditation', 'sleep_quality_rating', 'diet_type', 'food_allergies',
                'water_intake_goal_liters', 'tech_comfort_level', 'notification_frequency',
                'notification_time_preference', 'personality_type', 'motivation_type',
                'prefers_short_term_goals', 'prefers_long_term_goals', 'goal_reminder_enabled',
                'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'
            ]
            
            # Update preferences fields if provided
            for field in valid_fields:
                if field in kwargs:
                    # Validate the field value based on type
                    value = kwargs[field]
                    
                    # Type-specific validations
                    if field == 'sleep_quality_rating' and value is not None:
                        if not isinstance(value, int) or value < 1 or value > 10:
                            return {"error": "Sleep quality rating must be an integer between 1 and 10"}
                    
                    if field == 'water_intake_goal_liters' and value is not None:
                        try:
                            value = float(value)
                            if value < 0.5 or value > 10:
                                return {"error": "Water intake goal must be between 0.5 and 10 liters"}
                        except (ValueError, TypeError):
                            return {"error": "Invalid water intake goal value"}
                    
                    if field == 'exercise_goal_minutes_per_week' and value is not None:
                        try:
                            value = int(value)
                            if value < 0 or value > 2000:
                                return {"error": "Exercise goal must be between 0 and 2000 minutes per week"}
                        except (ValueError, TypeError):
                            return {"error": "Invalid exercise goal value"}
                    
                    # Set the field value
                    setattr(preferences, field, value)
                    updated_fields.append(field)
            
            if not updated_fields:
                return {"error": "No valid fields to update. Provide at least one preference field to update."}
            
            # Update individual field timestamps
            preferences.update_individual_timestamps(updated_fields)
            
            # Save the preferences
            preferences.save()
            
            # Get computed fields
            health_risk_factors = preferences.get_health_risk_factors()
            recommended_exercise_duration = preferences.get_recommended_exercise_duration()
            is_high_risk_user = preferences.is_high_risk_user()
            
            return {
                "success": True,
                "message": f"User preferences updated successfully",
                "action": "created" if created else "updated",
                "updated_fields": updated_fields,
                "preferences": {
                    "user_id": user.id,
                    "health_risk_factors": health_risk_factors,
                    "recommended_exercise_duration": recommended_exercise_duration,
                    "is_high_risk_user": is_high_risk_user,
                    "created_at": preferences.created_at.isoformat() if preferences.created_at else None,
                    "updated_at": preferences.updated_at.isoformat() if preferences.updated_at else None
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to update user preferences: {str(e)}"}


class GetEventsListTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="get_events_list",
            description="Get a list of all events for the authenticated user"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user to get events for"
                }
            },
            "required": ["user_id"]
        }
    
    def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        try:
            from tracking.models import Event
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Get all events for the user
            events = Event.objects.filter(user=user).order_by('-created_at')
            
            # Serialize events data
            events_data = []
            for event in events:
                events_data.append({
                    "id": str(event.id),
                    "title": event.title,
                    "address": event.address,
                    "link": event.link,
                    "start_date": event.start_date,
                    "when": event.when,
                    "is_attended": event.is_attended,
                    "created_at": event.created_at.isoformat() if event.created_at else None,
                    "json_data": event.json_data
                })
            
            return {
                "success": True,
                "events": events_data,
                "count": len(events_data)
            }
            
        except Exception as e:
            return {"error": f"Failed to get events list: {str(e)}"}


class CreateEventTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="create_event",
            description="Create a new event for the user"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user creating the event"
                },
                "title": {
                    "type": "string",
                    "description": "The title of the event"
                },
                "address": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "List of address components for the event location"
                },
                "link": {
                    "type": "string",
                    "description": "URL link for more information about the event"
                },
                "start_date": {
                    "type": "string",
                    "description": "Start date of the event (e.g., 'Mar 23' or full date)"
                },
                "when": {
                    "type": "string",
                    "description": "Additional timing information (e.g., '7:00 PM - 9:00 PM')"
                },
                "json_data": {
                    "type": "object",
                    "description": "Additional JSON data for the event"
                }
            },
            "required": ["user_id", "title", "start_date"]
        }
    
    def execute(self, user_id: int, title: str, start_date: str, **kwargs) -> Dict[str, Any]:
        try:
            from tracking.models import Event
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Create the event
            event_data = {
                "user": user,
                "title": title,
                "start_date": start_date,
                "address": kwargs.get("address", []),
                "link": kwargs.get("link", ""),
                "when": kwargs.get("when", ""),
                "json_data": kwargs.get("json_data", {}),
                "is_attended": False  # Default value
            }
            
            event = Event.objects.create(**event_data)
            
            return {
                "success": True,
                "message": "Event created successfully",
                "event": {
                    "id": str(event.id),
                    "title": event.title,
                    "address": event.address,
                    "link": event.link,
                    "start_date": event.start_date,
                    "when": event.when,
                    "is_attended": event.is_attended,
                    "created_at": event.created_at.isoformat() if event.created_at else None,
                    "json_data": event.json_data
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to create event: {str(e)}"}


class SearchEventsTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="search_events",
            description="Search for local events using Google Events API via SerpAPI"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query for events (e.g., 'Art classes', 'Yoga for seniors')"
                },
                "location": {
                    "type": "string",
                    "description": "The location for the event search (e.g., 'Adelaide', 'Sydney')",
                    "default": "Adelaide"
                }
            },
            "required": ["query"]
        }
    
    def execute(self, query: str, location: str = "Adelaide", **kwargs) -> Dict[str, Any]:
        try:
            import os
            from serpapi import GoogleSearch
            
            # Check for SerpAPI key
            api_key = os.getenv('SERPAPI_API_KEY')
            if not api_key:
                return {"error": "SerpAPI is not configured on the server"}
            
            params = {
                "api_key": api_key,
                "engine": "google_events",
                "q": query,
                "hl": "en",
                "gl": "us",
                "google_domain": "google.com.au",
                "location": location,
            }
            
            # Search for events
            search = GoogleSearch(params)
            results = search.get_dict()
            
            # Check if SerpAPI returned an error
            if "error" in results:
                return {"error": results["error"]}
            
            # Extract the events_results list
            events = results.get("events_results", [])
            
            # Format events for easier consumption
            formatted_events = []
            for event in events:
                formatted_event = {
                    "title": event.get("title", ""),
                    "date": {
                        "start_date": event.get("date", {}).get("start_date", ""),
                        "when": event.get("date", {}).get("when", "")
                    },
                    "address": event.get("address", []),
                    "link": event.get("link", ""),
                    "description": event.get("description", ""),
                    "venue": event.get("venue", {}).get("name", "") if event.get("venue") else "",
                    "thumbnail": event.get("thumbnail", "")
                }
                formatted_events.append(formatted_event)
            
            return {
                "success": True,
                "events": formatted_events,
                "count": len(formatted_events),
                "query": query,
                "location": location
            }
            
        except ImportError:
            return {"error": "SerpAPI library is not installed"}
        except Exception as e:
            return {"error": f"Failed to search events: {str(e)}"}


class ReverseGeocodeTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="reverse_geocode",
            description="Convert GPS coordinates to a human-readable address"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "latitude": {
                    "type": "number",
                    "description": "Latitude coordinate (e.g., -34.9285 for Adelaide)"
                },
                "longitude": {
                    "type": "number",
                    "description": "Longitude coordinate (e.g., 138.6007 for Adelaide)"
                }
            },
            "required": ["latitude", "longitude"]
        }
    
    def execute(self, latitude: float, longitude: float, **kwargs) -> Dict[str, Any]:
        try:
            import requests
            
            # Using Nominatim OpenStreetMap API for reverse geocoding (free, no API key required)
            url = "https://nominatim.openstreetmap.org/reverse"
            params = {
                "format": "json",
                "lat": latitude,
                "lon": longitude,
                "zoom": 18,  # Detailed address level
                "addressdetails": 1
            }
            headers = {
                "User-Agent": "LiveWell Health App/1.0"  # Required by Nominatim
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract address components
                address = data.get("address", {})
                display_name = data.get("display_name", "")
                
                # Build structured address
                structured_address = {
                    "full_address": display_name,
                    "house_number": address.get("house_number", ""),
                    "road": address.get("road", ""),
                    "suburb": address.get("suburb", ""),
                    "city": address.get("city", "") or address.get("town", "") or address.get("village", ""),
                    "state": address.get("state", ""),
                    "postcode": address.get("postcode", ""),
                    "country": address.get("country", ""),
                    "country_code": address.get("country_code", "")
                }
                
                # Create a simplified address string
                address_parts = []
                if structured_address["house_number"]:
                    address_parts.append(structured_address["house_number"])
                if structured_address["road"]:
                    address_parts.append(structured_address["road"])
                if structured_address["suburb"]:
                    address_parts.append(structured_address["suburb"])
                if structured_address["city"]:
                    address_parts.append(structured_address["city"])
                if structured_address["state"]:
                    address_parts.append(structured_address["state"])
                if structured_address["postcode"]:
                    address_parts.append(structured_address["postcode"])
                
                simple_address = ", ".join(filter(None, address_parts))
                
                return {
                    "success": True,
                    "location": {
                        "latitude": latitude,
                        "longitude": longitude,
                        "address": simple_address or display_name,
                        "full_address": display_name,
                        "details": structured_address,
                        "place_type": data.get("type", ""),
                        "importance": data.get("importance", 0)
                    }
                }
            else:
                return {"error": f"Geocoding service returned status {response.status_code}"}
                
        except requests.RequestException as e:
            return {"error": f"Failed to connect to geocoding service: {str(e)}"}
        except Exception as e:
            return {"error": f"Failed to reverse geocode coordinates: {str(e)}"}


class UpdateEventTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="update_event",
            description="Update an existing event for the user"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user updating the event"
                },
                "event_id": {
                    "type": "string",
                    "description": "The UUID of the event to update"
                },
                "title": {
                    "type": "string",
                    "description": "The updated title of the event"
                },
                "address": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "Updated list of address components for the event location"
                },
                "link": {
                    "type": "string",
                    "description": "Updated URL link for more information about the event"
                },
                "start_date": {
                    "type": "string",
                    "description": "Updated start date of the event (e.g., 'Mar 23' or full date)"
                },
                "when": {
                    "type": "string",
                    "description": "Updated timing information (e.g., '7:00 PM - 9:00 PM')"
                },
                "is_attended": {
                    "type": "boolean",
                    "description": "Whether the user attended the event"
                },
                "json_data": {
                    "type": "object",
                    "description": "Updated additional JSON data for the event"
                }
            },
            "required": ["user_id", "event_id"]
        }
    
    def execute(self, user_id: int, event_id: str, **kwargs) -> Dict[str, Any]:
        try:
            from tracking.models import Event
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}
            
            # Get the event
            try:
                event = Event.objects.get(id=event_id, user=user)
            except Event.DoesNotExist:
                return {"error": f"Event with ID {event_id} not found for user {user_id}"}
            
            # Update event fields if provided
            updated_fields = []
            
            if "title" in kwargs and kwargs["title"] is not None:
                event.title = kwargs["title"]
                updated_fields.append("title")
            
            if "address" in kwargs and kwargs["address"] is not None:
                event.address = kwargs["address"]
                updated_fields.append("address")
            
            if "link" in kwargs and kwargs["link"] is not None:
                event.link = kwargs["link"]
                updated_fields.append("link")
            
            if "start_date" in kwargs and kwargs["start_date"] is not None:
                event.start_date = kwargs["start_date"]
                updated_fields.append("start_date")
            
            if "when" in kwargs and kwargs["when"] is not None:
                event.when = kwargs["when"]
                updated_fields.append("when")
            
            if "is_attended" in kwargs and kwargs["is_attended"] is not None:
                event.is_attended = kwargs["is_attended"]
                updated_fields.append("is_attended")
            
            if "json_data" in kwargs and kwargs["json_data"] is not None:
                event.json_data = kwargs["json_data"]
                updated_fields.append("json_data")
            
            if not updated_fields:
                return {"error": "No fields to update. Provide at least one field to update."}
            
            # Save the updated event
            event.save()
            
            return {
                "success": True,
                "message": f"Event updated successfully",
                "updated_fields": updated_fields,
                "event": {
                    "id": str(event.id),
                    "title": event.title,
                    "address": event.address,
                    "link": event.link,
                    "start_date": event.start_date,
                    "when": event.when,
                    "is_attended": event.is_attended,
                    "created_at": event.created_at.isoformat() if event.created_at else None,
                    "json_data": event.json_data
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to update event: {str(e)}"}


class FetchRecipesTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="fetch_recipes",
            description="Fetch healthy recipes based on dietary preferences, ingredients, or health conditions"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for recipes (e.g., 'low sodium chicken', 'diabetic friendly desserts', 'heart healthy meals')",
                    "default": ""
                },
                "diet_type": {
                    "type": "string",
                    "enum": ["any", "vegetarian", "vegan", "pescatarian", "mediterranean", "low_sodium", "diabetic_friendly", "heart_healthy", "gluten_free"],
                    "description": "Dietary restriction or type",
                    "default": "any"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of recipes to return (default: 10, max: 20)",
                    "default": 10
                },
                "cuisine_type": {
                    "type": "string",
                    "description": "Type of cuisine (e.g., 'italian', 'asian', 'mexican', 'indian')"
                },
                "meal_type": {
                    "type": "string",
                    "enum": ["any", "breakfast", "lunch", "dinner", "snack", "dessert"],
                    "description": "Type of meal",
                    "default": "any"
                },
                "max_prep_time": {
                    "type": "integer",
                    "description": "Maximum preparation time in minutes"
                },
                "health_labels": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "Health labels to filter by (e.g., ['low-fat', 'low-carb', 'high-protein'])"
                }
            },
            "required": []
        }
    
    def execute(self, query: str = "", diet_type: str = "any", max_results: int = 10, 
                cuisine_type: Optional[str] = None, meal_type: str = "any",
                max_prep_time: Optional[int] = None, health_labels: Optional[list] = None, **kwargs) -> Dict[str, Any]:
        try:
            # Check for Spoonacular API key
            api_key = os.getenv('SPOONACULAR_API_KEY')
            
            if not api_key:
                # Return helpful mock data if no API key
                return self._get_mock_recipes(query, diet_type, max_results, meal_type)
            
            # Validate and limit max_results
            max_results = min(max(max_results, 1), 20)
            
            # Build Spoonacular API URL
            url = "https://api.spoonacular.com/recipes/complexSearch"
            
            # Build parameters
            params = {
                "apiKey": api_key,
                "number": max_results,
                "addRecipeInformation": True,  # Get full recipe details
                "addRecipeNutrition": True,    # Get nutrition information
                "fillIngredients": True,        # Get ingredient details
                "instructionsRequired": True    # Only recipes with instructions
            }
            
            # Add search query
            if query.strip():
                params["query"] = query
            else:
                # If no query, use diet or meal type as search
                if diet_type != "any" and diet_type != "diabetic_friendly":
                    params["query"] = diet_type.replace("_", " ")
                elif meal_type != "any":
                    params["type"] = meal_type
                else:
                    params["query"] = "healthy"
            
            # Map diet types to Spoonacular diet parameters
            if diet_type != "any":
                diet_map = {
                    "vegetarian": "vegetarian",
                    "vegan": "vegan",
                    "pescatarian": "pescetarian",
                    "mediterranean": "mediterranean",
                    "diabetic_friendly": "low sugar",
                    "heart_healthy": "whole30",
                    "gluten_free": "gluten free",
                    "low_sodium": "low sodium"
                }
                
                if diet_type in ["vegetarian", "vegan", "pescatarian"]:
                    params["diet"] = diet_map[diet_type]
                elif diet_type in diet_map:
                    # For other diets, add to query
                    if "query" in params:
                        params["query"] = f"{params['query']} {diet_map[diet_type]}"
                    else:
                        params["query"] = diet_map[diet_type]
            
            # Add cuisine filter
            if cuisine_type:
                params["cuisine"] = cuisine_type
            
            # Add meal type filter
            if meal_type != "any":
                meal_type_map = {
                    "breakfast": "breakfast",
                    "lunch": "main course",
                    "dinner": "main course",
                    "snack": "snack",
                    "dessert": "dessert"
                }
                params["type"] = meal_type_map.get(meal_type, meal_type)
            
            # Add max ready time filter (in minutes)
            if max_prep_time:
                params["maxReadyTime"] = max_prep_time
            
            # Add health labels as intolerances or in query
            if health_labels:
                intolerance_map = {
                    "dairy-free": "dairy",
                    "egg-free": "egg",
                    "gluten-free": "gluten",
                    "peanut-free": "peanut",
                    "soy-free": "soy",
                    "wheat-free": "wheat"
                }
                
                intolerances = []
                for label in health_labels:
                    if label.lower() in intolerance_map:
                        intolerances.append(intolerance_map[label.lower()])
                
                if intolerances:
                    params["intolerances"] = ",".join(intolerances)
            
            # Make the API request
            response = requests.get(url, params=params, timeout=15)
            
            print(f"DEBUG: Spoonacular API request to {url}")
            print(f"DEBUG: Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                print(f"DEBUG: Found {len(results)} recipes from Spoonacular")
                
                recipes = []
                for recipe in results:
                    # Extract ingredients
                    ingredients = []
                    extended_ingredients = recipe.get('extendedIngredients', [])
                    for ing in extended_ingredients:
                        ingredients.append(ing.get('original', ''))
                    
                    # Extract instructions
                    instruction_steps = []
                    analyzed_instructions = recipe.get('analyzedInstructions', [])
                    if analyzed_instructions:
                        for instruction_set in analyzed_instructions:
                            steps = instruction_set.get('steps', [])
                            for step in steps:
                                instruction_steps.append(f"Step {step.get('number', '')}: {step.get('step', '')}")
                    
                    # Extract nutrition information
                    nutrition_data = recipe.get('nutrition', {})
                    nutrients = nutrition_data.get('nutrients', [])
                    
                    # Find specific nutrients
                    calories = next((n['amount'] for n in nutrients if n['name'] == 'Calories'), 0)
                    protein = next((n['amount'] for n in nutrients if n['name'] == 'Protein'), 0)
                    carbs = next((n['amount'] for n in nutrients if n['name'] == 'Carbohydrates'), 0)
                    fat = next((n['amount'] for n in nutrients if n['name'] == 'Fat'), 0)
                    fiber = next((n['amount'] for n in nutrients if n['name'] == 'Fiber'), 0)
                    sodium = next((n['amount'] for n in nutrients if n['name'] == 'Sodium'), 0)
                    sugar = next((n['amount'] for n in nutrients if n['name'] == 'Sugar'), 0)
                    
                    # Get cuisines and dish types
                    cuisines = recipe.get('cuisines', [])
                    dish_types = recipe.get('dishTypes', [])
                    diets = recipe.get('diets', [])
                    
                    # Get health score (0-100)
                    health_score = recipe.get('healthScore', 0)
                    
                    # Format the recipe
                    formatted_recipe = {
                        "title": recipe.get('title', ''),
                        "url": recipe.get('sourceUrl', recipe.get('spoonacularSourceUrl', '')),
                        "image": recipe.get('image', ''),
                        "source": "Spoonacular",
                        "servings": recipe.get('servings', 4),
                        "prep_time": recipe.get('readyInMinutes', 0),
                        "cuisine_type": cuisines,
                        "meal_type": dish_types,
                        "diet_labels": diets,
                        "health_labels": [],
                        "ingredients": ingredients,
                        "instructions": instruction_steps,
                        "summary": recipe.get('summary', '').replace('<b>', '').replace('</b>', ''),
                        "health_score": health_score,
                        "nutrition": {
                            "calories": round(calories, 1),
                            "protein_g": round(protein, 1),
                            "carbs_g": round(carbs, 1),
                            "fat_g": round(fat, 1),
                            "fiber_g": round(fiber, 1),
                            "sodium_mg": round(sodium, 1),
                            "sugar_g": round(sugar, 1),
                            "calories_per_serving": round(calories / recipe.get('servings', 1), 1) if recipe.get('servings') else calories
                        },
                        "allergens": [],
                        "recipe_id": str(recipe.get('id', '')),
                        "cheap": recipe.get('cheap', False),
                        "dairy_free": recipe.get('dairyFree', False),
                        "gluten_free": recipe.get('glutenFree', False),
                        "vegetarian": recipe.get('vegetarian', False),
                        "vegan": recipe.get('vegan', False),
                        "very_healthy": recipe.get('veryHealthy', False),
                        "weight_watcher_points": recipe.get('weightWatcherSmartPoints', 0),
                        "gaps": recipe.get('gaps', 'no'),
                        "low_fodmap": recipe.get('lowFodmap', False),
                        "sustainable": recipe.get('sustainable', False)
                    }
                    recipes.append(formatted_recipe)
                
                # Return the results
                return {
                    "success": True,
                    "query": query if query else "healthy recipes",
                    "diet_type": diet_type,
                    "total_results": len(recipes),
                    "recipes": recipes,
                    "search_parameters": {
                        "diet_type": diet_type,
                        "cuisine_type": cuisine_type,
                        "meal_type": meal_type,
                        "max_prep_time": max_prep_time,
                        "health_labels": health_labels
                    },
                    "api_source": "Spoonacular API"
                }
            
            elif response.status_code == 402:
                return {
                    "error": "Spoonacular API daily limit reached (150 requests/day for free tier)",
                    "message": "Please try again tomorrow or upgrade to a paid plan"
                }
            else:
                return {
                    "error": f"Spoonacular API error: {response.status_code}",
                    "message": response.text[:200]
                }
            
        except requests.RequestException as e:
            return {"error": f"Recipe API request failed: {str(e)}"}
        except KeyError as e:
            return {"error": f"Invalid recipe data received: {str(e)}"}
        except Exception as e:
            return {"error": f"Failed to fetch recipes: {str(e)}"}
    
    def _get_mock_recipes(self, query: str, diet_type: str, max_results: int, meal_type: str) -> Dict[str, Any]:
        """Return mock recipe data when TheMealDB API doesn't return results"""
        
        print(f"DEBUG: Returning mock data - No Spoonacular API key configured")
        
        # Create more realistic mock recipes based on the actual search parameters
        base_recipes = {
            "diabetic_friendly": [
                {
                    "title": "Grilled Chicken with Steamed Vegetables",
                    "ingredients": ["4 chicken breasts", "2 cups broccoli", "1 cup carrots", "olive oil", "herbs"],
                    "instructions": ["Season chicken with herbs", "Grill for 6-8 minutes per side", "Steam vegetables until tender", "Serve together"],
                    "category": "Main Course",
                    "area": "American"
                },
                {
                    "title": "Baked Salmon with Asparagus",
                    "ingredients": ["4 salmon fillets", "1 lb asparagus", "lemon", "garlic", "olive oil"],
                    "instructions": ["Preheat oven to 400°F", "Season salmon and asparagus", "Bake for 12-15 minutes", "Serve with lemon"],
                    "category": "Seafood",
                    "area": "Mediterranean"
                }
            ],
            "vegetarian": [
                {
                    "title": "Mediterranean Quinoa Bowl",
                    "ingredients": ["1 cup quinoa", "2 cups spinach", "cherry tomatoes", "cucumber", "feta cheese", "olive oil"],
                    "instructions": ["Cook quinoa according to package", "Mix with fresh vegetables", "Top with feta", "Drizzle with olive oil"],
                    "category": "Vegetarian",
                    "area": "Mediterranean"
                }
            ],
            "dessert": [
                {
                    "title": "Sugar-Free Chocolate Mousse",
                    "ingredients": ["dark chocolate", "avocado", "stevia", "vanilla extract", "coconut cream"],
                    "instructions": ["Melt chocolate", "Blend with avocado and stevia", "Chill for 2 hours", "Serve with cream"],
                    "category": "Dessert",
                    "area": "French"
                }
            ]
        }
        
        # Select appropriate recipes based on parameters
        selected_recipes = []
        
        if diet_type in base_recipes:
            selected_recipes = base_recipes[diet_type]
        elif meal_type in base_recipes:
            selected_recipes = base_recipes[meal_type]
        else:
            # Default fallback
            selected_recipes = base_recipes["diabetic_friendly"]
        
        # Format the mock recipes
        mock_recipes = []
        for i, recipe in enumerate(selected_recipes[:max_results]):
            formatted_recipe = {
                "title": recipe["title"],
                "url": f"https://themealdb.com/meal/{52772 + i}",  # Realistic URL format
                "image": f"https://www.themealdb.com/images/media/meals/mock{i+1}.jpg",
                "source": "TheMealDB (Mock)",
                "servings": 4,
                "prep_time": 30,
                "cuisine_type": [recipe["area"].lower()],
                "meal_type": [meal_type] if meal_type != "any" else [recipe["category"].lower()],
                "diet_labels": [diet_type] if diet_type != "any" else [],
                "health_labels": [],
                "ingredients": recipe["ingredients"],
                "instructions": recipe["instructions"],
                "category": recipe["category"],
                "area": recipe["area"],
                "nutrition": {
                    "calories": 0,  # TheMealDB doesn't provide nutrition
                    "protein_g": 0,
                    "carbs_g": 0,
                    "fat_g": 0,
                    "fiber_g": 0,
                    "sodium_mg": 0,
                    "calories_per_serving": 0
                },
                "allergens": [],
                "recipe_id": f"mock{52772 + i}",
                "youtube_video": "",
                "tags": [diet_type] if diet_type != "any" else []
            }
            mock_recipes.append(formatted_recipe)
        
        return {
            "success": True,
            "query": query,
            "diet_type": diet_type,
            "total_results": len(mock_recipes),
            "recipes": mock_recipes,
            "search_parameters": {
                "diet_type": diet_type,
                "meal_type": meal_type
            },
            "api_source": "Mock Data",
            "note": "To get real recipe data, add SPOONACULAR_API_KEY to your .env file. Get your free API key at https://spoonacular.com/food-api"
        }

class CreateGoalTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="create_goal",
            description="Create a new goal for the user"
        )

    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user to create the goal for"
                },
                "title": {
                    "type": "string",
                    "description": "The title of the goal"
                },
                "is_active": {
                    "type": "boolean",
                    "description": "Active status of the goal"
                },
                "category": {
                    "type": "string",
                    "enum": ["mind", "social", "nutrition", "activity"],
                    "description": "The category of the goal"
                },
                "frequency": {
                    "type": "string",
                    "enum": ["daily", "weekly", "fortnightly", "monthly"],
                    "description": "How often the goal should be completed"
                }
            },
            "required": ["user_id", "title", "category", "frequency"]
        }

    def execute(self, user_id: int, title: str, category: str, frequency: str, is_active: bool = True, **kwargs) -> Dict[str, Any]:
        try:
            from tracking.models import Goal
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}

            # Create the goal
            goal_data = {
                "user": user,
                "title": title,
                "category": category,
                "frequency": frequency,
                "is_active": is_active
            }
            
            goal = Goal.objects.create(**goal_data)
            
            return {
                "success": True,
                "message": "Goal created successfully",
                "goal": {
                    "id": goal.id,
                    "title": goal.title,
                    "category": goal.category,
                    "frequency": goal.frequency,
                    "is_active": goal.is_active
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to create goal: {str(e)}"}


class UpdateGoalTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="update_goal",
            description="Update an existing goal for the user"
        )

    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "The ID of the user updating the goal"
                },
                "goal_id": {
                    "type": "integer",
                    "description": "The ID of the goal to update"
                },
                "title": {
                    "type": "string",
                    "description": "The updated title of the goal"
                },
                "is_active": {
                    "type": "boolean",
                    "description": "Updated active status of the goal"
                },
                "category": {
                    "type": "string",
                    "enum": ["mind", "social", "nutrition", "activity"],
                    "description": "The updated category of the goal"
                },
                "frequency": {
                    "type": "string",
                    "enum": ["daily", "weekly", "fortnightly", "monthly"],
                    "description": "Updated frequency"
                }
            },
            "required": ["user_id", "goal_id"]
        }

    def execute(self, user_id: int, goal_id: int, **kwargs) -> Dict[str, Any]:
        try:
            from tracking.models import Goal
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return {"error": f"User with ID {user_id} not found"}

            # Get the goal
            try:
                goal = Goal.objects.get(id=goal_id, user=user)
            except Goal.DoesNotExist:
                return {"error": f"Goal with ID {goal_id} not found for this user"}

            # Update goal fields if provided
            updated_fields = []
            
            if "title" in kwargs and kwargs["title"] is not None:
                goal.title = kwargs["title"]
                updated_fields.append("title")
            
            if "is_active" in kwargs and kwargs["is_active"] is not None:
                goal.is_active = kwargs["is_active"]
                updated_fields.append("is_active")
            
            if "category" in kwargs and kwargs["category"] is not None:
                if kwargs["category"] not in ["mind", "social", "nutrition", "activity"]:
                    return {"error": "Invalid category. Must be 'mind', 'social', 'nutrition', or 'activity'"}
                goal.category = kwargs["category"]
                updated_fields.append("category")
            
            if "frequency" in kwargs and kwargs["frequency"] is not None:
                if kwargs["frequency"] not in ["daily", "weekly", "fortnightly", "monthly"]:
                    return {"error": "Invalid frequency. Must be 'daily', 'weekly', 'fortnightly', or 'monthly'"}
                goal.frequency = kwargs["frequency"]
                updated_fields.append("frequency")

            if not updated_fields:
                return {"error": "No fields to update. Provide at least one field to update."}

            # Save the goal
            goal.save()
            
            return {
                "success": True,
                "message": f"Goal updated successfully",
                "updated_fields": updated_fields,
                "goal": {
                    "id": goal.id,
                    "title": goal.title,
                    "category": goal.category,
                    "frequency": goal.frequency,
                    "is_active": goal.is_active
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to update goal: {str(e)}"}

class FindPlacesTool(ServerTool):
    def __init__(self):
        super().__init__(
            name="find_places",
            description="Find nearby places like hospitals, pharmacies, parks, restaurants, etc. based on location and search query"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for places (e.g., 'pharmacy', 'hospital', 'park', 'restaurant', 'grocery store')"
                },
                "latitude": {
                    "type": "number",
                    "description": "Latitude coordinate of the search location"
                },
                "longitude": {
                    "type": "number",
                    "description": "Longitude coordinate of the search location"
                },
                "radius": {
                    "type": "integer",
                    "description": "Search radius in meters (default: 5000, max: 50000)",
                    "default": 5000
                },
                "place_type": {
                    "type": "string",
                    "description": "Specific place type filter (e.g., 'hospital', 'pharmacy', 'restaurant', 'park')"
                },
                "open_now": {
                    "type": "boolean",
                    "description": "Only return places that are currently open",
                    "default": False
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of places to return (default: 10, max: 20)",
                    "default": 10
                }
            },
            "required": ["query", "latitude", "longitude"]
        }
    
    def execute(self, query: str, latitude: float, longitude: float, 
                radius: int = 5000, place_type: Optional[str] = None,
                open_now: bool = False, max_results: int = 10, **kwargs) -> Dict[str, Any]:
        try:
            # Check for Google Places API key
            google_api_key = os.getenv('GOOGLE_PLACES_API_KEY')
            
            if google_api_key:
                # Use Google Places API
                return self._search_google_places(query, latitude, longitude, radius, 
                                                 place_type, open_now, max_results, google_api_key)
            else:
                # Use OpenStreetMap Nominatim as fallback (free, no API key required)
                return self._search_openstreetmap(query, latitude, longitude, radius, max_results)
            
        except Exception as e:
            return {"error": f"Failed to find places: {str(e)}"}
    
    def _search_google_places(self, query: str, lat: float, lng: float, 
                             radius: int, place_type: Optional[str], 
                             open_now: bool, max_results: int, api_key: str) -> Dict[str, Any]:
        """Search using Google Places API"""
        try:
            import requests
            
            # Validate inputs
            radius = min(max(radius, 1), 50000)  # Between 1m and 50km
            max_results = min(max(max_results, 1), 20)
            
            # Google Places Nearby Search API
            url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            
            params = {
                "key": api_key,
                "location": f"{lat},{lng}",
                "radius": radius,
                "keyword": query
            }
            
            # Add optional filters
            if place_type:
                params["type"] = place_type
            
            if open_now:
                params["opennow"] = True
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code != 200:
                return {"error": f"Google Places API error: {response.status_code}"}
            
            data = response.json()
            
            if data.get("status") != "OK" and data.get("status") != "ZERO_RESULTS":
                return {"error": f"Google Places API error: {data.get('status', 'Unknown error')}"}
            
            # Format results
            places = []
            results = data.get("results", [])[:max_results]
            
            for place in results:
                # Calculate distance from search point
                place_lat = place.get("geometry", {}).get("location", {}).get("lat", 0)
                place_lng = place.get("geometry", {}).get("location", {}).get("lng", 0)
                distance = self._calculate_distance(lat, lng, place_lat, place_lng)
                
                formatted_place = {
                    "name": place.get("name", ""),
                    "address": place.get("vicinity", ""),
                    "latitude": place_lat,
                    "longitude": place_lng,
                    "distance_meters": round(distance),
                    "distance_km": round(distance / 1000, 2),
                    "rating": place.get("rating", 0),
                    "user_ratings_total": place.get("user_ratings_total", 0),
                    "types": place.get("types", []),
                    "is_open": place.get("opening_hours", {}).get("open_now", None),
                    "place_id": place.get("place_id", ""),
                    "price_level": place.get("price_level", None),
                    "wheelchair_accessible": "wheelchair_accessible_entrance" in place.get("types", [])
                }
                places.append(formatted_place)
            
            # Sort by distance
            places.sort(key=lambda x: x["distance_meters"])
            
            return {
                "success": True,
                "query": query,
                "location": {
                    "latitude": lat,
                    "longitude": lng
                },
                "search_radius_meters": radius,
                "total_results": len(places),
                "places": places,
                "api_source": "Google Places API"
            }
            
        except Exception as e:
            return {"error": f"Google Places search failed: {str(e)}"}
    
    def _search_openstreetmap(self, query: str, lat: float, lng: float, 
                              radius: int, max_results: int) -> Dict[str, Any]:
        """Search using OpenStreetMap Overpass API (free alternative)"""
        try:
            import requests
            
            # Convert radius to degrees (approximate)
            radius_deg = radius / 111000  # 1 degree ≈ 111km
            
            # Define search boundaries
            min_lat = lat - radius_deg
            max_lat = lat + radius_deg
            min_lng = lng - radius_deg
            max_lng = lng + radius_deg
            
            # Use Nominatim for place search
            url = "https://nominatim.openstreetmap.org/search"
            
            params = {
                "q": query,
                "format": "json",
                "limit": max_results * 2,  # Get extra results to filter
                "bounded": 1,
                "viewbox": f"{min_lng},{min_lat},{max_lng},{max_lat}",
                "extratags": 1,
                "addressdetails": 1
            }
            
            headers = {
                "User-Agent": "LiveWell Health App/1.0"
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code != 200:
                return {"error": f"OpenStreetMap API error: {response.status_code}"}
            
            data = response.json()
            
            # Format results
            places = []
            for place in data[:max_results]:
                place_lat = float(place.get("lat", 0))
                place_lng = float(place.get("lon", 0))
                distance = self._calculate_distance(lat, lng, place_lat, place_lng)
                
                # Only include places within the radius
                if distance <= radius:
                    # Extract address components
                    address_parts = []
                    address_data = place.get("address", {})
                    
                    if address_data.get("house_number"):
                        address_parts.append(address_data["house_number"])
                    if address_data.get("road"):
                        address_parts.append(address_data["road"])
                    if address_data.get("suburb") or address_data.get("neighbourhood"):
                        address_parts.append(address_data.get("suburb") or address_data.get("neighbourhood"))
                    if address_data.get("city") or address_data.get("town"):
                        address_parts.append(address_data.get("city") or address_data.get("town"))
                    
                    formatted_place = {
                        "name": place.get("display_name", "").split(",")[0],
                        "address": ", ".join(address_parts) if address_parts else place.get("display_name", ""),
                        "latitude": place_lat,
                        "longitude": place_lng,
                        "distance_meters": round(distance),
                        "distance_km": round(distance / 1000, 2),
                        "rating": 0,  # Not available in OSM
                        "user_ratings_total": 0,
                        "types": [place.get("type", ""), place.get("class", "")],
                        "is_open": None,  # Not available in OSM
                        "place_id": place.get("osm_id", ""),
                        "price_level": None,
                        "wheelchair_accessible": place.get("extratags", {}).get("wheelchair", "unknown") == "yes"
                    }
                    places.append(formatted_place)
            
            # Sort by distance
            places.sort(key=lambda x: x["distance_meters"])
            
            return {
                "success": True,
                "query": query,
                "location": {
                    "latitude": lat,
                    "longitude": lng
                },
                "search_radius_meters": radius,
                "total_results": len(places),
                "places": places,
                "api_source": "OpenStreetMap (Free)",
                "note": "For better results with ratings and opening hours, add GOOGLE_PLACES_API_KEY to your .env file"
            }
            
        except Exception as e:
            return {"error": f"OpenStreetMap search failed: {str(e)}"}
    
    def _calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points using Haversine formula (returns meters)"""
        import math
        
        R = 6371000  # Earth's radius in meters
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * 
             math.sin(delta_lng / 2) ** 2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c