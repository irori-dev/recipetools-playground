import { useState, useEffect } from "react";
import { parseRecipe, generateProcessGraph, validateRecipe, Recipe, Ingredient, Step } from "@recipetools/core";
import Mermaid from "./components/mermaid";

// ISO 8601形式の時間文字列を人間が読みやすい形式に変換する関数
function formatDuration(duration: string): string {
  // PT5M、PT1H30M、P1DT2H、などの形式を処理
  if (!duration) return "";

  // 基本的なパターン: PT[時間]H[分]M[秒]S
  const regex = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);

  if (!match) return duration; // パターンにマッチしない場合はそのまま返す

  const days = match[1] ? parseInt(match[1]) : 0;
  const hours = match[2] ? parseInt(match[2]) : 0;
  const minutes = match[3] ? parseInt(match[3]) : 0;
  const seconds = match[4] ? parseInt(match[4]) : 0;

  const parts = [];
  if (days > 0) parts.push(`${days} 日`);
  if (hours > 0) parts.push(`${hours} 時間`);
  if (minutes > 0) parts.push(`${minutes} 分`);
  if (seconds > 0) parts.push(`${seconds} 秒`);

  return parts.length > 0 ? parts.join(' ') : '0 分';
}

export default function App() {
  const [input, setInput] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [graph, setGraph] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // URLパラメータに基づいてサンプルJSONを読み込む
  useEffect(() => {
    const loadSampleFromUrl = async () => {
      try {
        // URLからサンプル名を取得
        const urlPath = window.location.pathname;
        let sampleName = '';

        // パス '/' 後のサンプル名を取得または URLSearchParams から取得
        if (urlPath.length > 1) {
          // '/sample-name' の形式からサンプル名を抽出
          sampleName = urlPath.substring(1);
        } else {
          // 'サンプル名'または'?サンプル名'の形式をチェック
          const searchStr = window.location.search;
          if (searchStr.startsWith('?') && searchStr.length > 1) {
            sampleName = searchStr.substring(1);
          }
        }

        if (sampleName) {
          // 対応するJSONファイルを読み込む
          const response = await fetch(`/samples/${sampleName}.json`);
          if (response.ok) {
            const jsonText = await response.text();
            setInput(jsonText);
            // 自動的にレシピを生成
            handleSampleLoad(jsonText);
          }
        }
      } catch (error) {
        console.error('サンプルの読み込みに失敗しました:', error);
      }
    };

    loadSampleFromUrl();
  }, []);

  // サンプル読み込み時のハンドラー
  const handleSampleLoad = (jsonText: string) => {
    try {
      console.log("サンプルJSONテキスト:", jsonText);
      const parsedJson = JSON.parse(jsonText);
      console.log("パース後のJSON:", parsedJson);
      
      // バリデーションエラーの詳細を手動で確認
      const errors: string[] = [];

      // 基本的な必須項目のチェック
      if (!parsedJson.title) errors.push("タイトルが必要です");
      if (!Array.isArray(parsedJson.ingredients) || parsedJson.ingredients.length === 0) {
        errors.push("材料リストが必要です");
      }
      if (!Array.isArray(parsedJson.steps) || parsedJson.steps.length === 0) {
        errors.push("手順が必要です");
      }
      if (!parsedJson.results) errors.push("results フィールドが必要です");

      console.log("手動バリデーションエラー:", errors);
      
      if (validateRecipe(parsedJson)) {
        console.log("validateRecipe 成功");
        const parsedRecipe = parseRecipe(parsedJson);
        setRecipe(parsedRecipe);
        const mermaidCode = generateProcessGraph(parsedRecipe);
        setGraph(mermaidCode);
        setError(null);
        setValidationErrors([]);
      } else {
        console.error("validateRecipe 失敗");
        setError("サンプルレシピの形式が正しくありません");
        
        // validateRecipeが失敗した場合は手動のエラーも表示する
        if (errors.length > 0) {
          setValidationErrors(errors);
        }
      }
    } catch (e) {
      console.error("サンプルJSONパースエラー:", e);
      setError("サンプルJSONのパースに失敗しました");
    }
  };

  const handleGenerate = () => {
    try {
      // JSONのパースを試みる
      const parsedJson = JSON.parse(input);

      // validateRecipeでバリデーションを行う
      if (!validateRecipe(parsedJson)) {
        // バリデーションエラーの詳細を収集
        const errors: string[] = [];

        // 基本的な必須項目のチェック
        if (!parsedJson.title) errors.push("タイトルが必要です");
        if (!Array.isArray(parsedJson.ingredients) || parsedJson.ingredients.length === 0) {
          errors.push("材料リストが必要です");
        }
        if (!Array.isArray(parsedJson.steps) || parsedJson.steps.length === 0) {
          errors.push("手順が必要です");
        }

        // 材料の各項目チェック
        if (Array.isArray(parsedJson.ingredients)) {
          parsedJson.ingredients.forEach((ing: Ingredient, idx: number) => {
            if (!ing.id) errors.push(`材料${idx + 1}: IDが必要です`);
            if (!ing.name) errors.push(`材料${idx + 1}: 名前が必要です`);
            if (ing.quantity === undefined) errors.push(`材料${idx + 1}: 分量が必要です`);
            if (!ing.unit) errors.push(`材料${idx + 1}: 単位が必要です`);
          });
        }

        // 手順の各項目チェック
        if (Array.isArray(parsedJson.steps)) {
          parsedJson.steps.forEach((step: Step, idx: number) => {
            if (!step.id) errors.push(`手順${idx + 1}: IDが必要です`);
            if (!step.action) errors.push(`手順${idx + 1}: 操作内容が必要です`);
            if (!Array.isArray(step.ingredients)) {
              errors.push(`手順${idx + 1}: 材料リストが必要です`);
            }
            if (!step.duration) errors.push(`手順${idx + 1}: 所要時間が必要です`);
            if (!Array.isArray(step.dependsOn)) {
              errors.push(`手順${idx + 1}: 依存関係リストが必要です`);
            }
          });
        }

        setValidationErrors(errors);
        setError("レシピのフォーマットが正しくありません");
        setRecipe(null);
        setGraph(null);
        return;
      }

      // バリデーションが成功したらレシピを解析して表示
      const parsedRecipe = parseRecipe(parsedJson);
      setRecipe(parsedRecipe);
      const mermaidCode = generateProcessGraph(parsedRecipe);
      setGraph(mermaidCode);
      setError(null);
      setValidationErrors([]);
    } catch (e) {
      console.error(e);
      setError("JSONのパースに失敗しました");
      setValidationErrors([]);
      setRecipe(null);
      setGraph(null);
    }
  };

  // 材料IDから材料オブジェクトを取得する関数
  const getIngredientById = (id: string): Ingredient | undefined => {
    if (!recipe) return undefined;
    return recipe.ingredients.find(ing => ing.id === id);
  };

  // 材料IDのリストから材料名と分量を表示用にフォーマットする関数
  const formatIngredients = (ingredientIds: string[]): string => {
    if (!recipe) return "";

    return ingredientIds.map(id => {
      const ingredient = getIngredientById(id);
      if (!ingredient) return id; // 材料が見つからない場合はIDをそのまま返す

      // 「材料名 (分量 単位)」の形式で返す
      return `${ingredient.name} (${ingredient.quantity} ${ingredient.unit})`;
    }).join('、 ');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-center">レシピビューワー</h1>
        
        <div className="mt-4 text-center">
          <a href="/samples/index.html" className="text-blue-600 hover:underline">サンプルレシピを見る</a>
        </div>

        <div className="card mt-6">
          <div className="mb-4">
            <label htmlFor="recipe-input" className="block text-sm font-medium text-gray-700 mb-1">
              レシピJSON
            </label>
            <textarea
              id="recipe-input"
              className="input-area h-64 p-3 resize-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ここにレシピのJSONを貼り付けてください"
            />
          </div>

          <div className="flex justify-center">
            <button onClick={handleGenerate} className="btn">
              レシピを表示する
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
            <p className="font-bold">{error}</p>
            {validationErrors.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold">詳細:</p>
                <ul className="list-disc ml-5 mt-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {recipe && (
          <div className="mt-6 space-y-6">
            {/* レシピの基本情報 */}
            <div className="card">
              <h2 className="text-xl font-semibold text-blue-700 mb-2">レシピ情報</h2>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{recipe.title}</h3>
                {recipe.description && <p className="text-gray-700">{recipe.description}</p>}

                {recipe.metadata && (
                  <div className="text-sm text-gray-500 mt-2">
                    {recipe.metadata.author && <p>作者: {recipe.metadata.author}</p>}
                    {recipe.metadata.createdAt && <p>作成日: {recipe.metadata.createdAt}</p>}
                    {recipe.metadata.updatedAt && <p>更新日: {recipe.metadata.updatedAt}</p>}
                  </div>
                )}

                {recipe.yield && (
                  <p className="text-gray-700">分量: {recipe.yield.quantity} {recipe.yield.unit}</p>
                )}
              </div>
            </div>

            {/* 材料リスト */}
            <div className="card">
              <h2 className="text-xl font-semibold text-blue-700 mb-3">材料</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipe.ingredients.map((ingredient: Ingredient) => (
                  <div key={ingredient.id} className="flex justify-between border-b border-gray-200 pb-2">
                    <div>
                      <span className="font-medium">{ingredient.name}</span>
                      {ingredient.preparation && <span className="text-gray-600 ml-1">（{ingredient.preparation}）</span>}
                    </div>
                    <div className="text-right">
                      {ingredient.quantity} {ingredient.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 手順 */}
            <div className="card">
              <h2 className="text-xl font-semibold text-blue-700 mb-3">手順</h2>
              <ol className="space-y-4">
                {recipe.steps.map((step: Step, index: number) => (
                  <li key={step.id} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-800 font-bold rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{step.action}</p>
                        {step.ingredients.length > 0 && (
                          <p className="text-gray-600 text-sm mt-1">
                            使用材料: {formatIngredients(step.ingredients)}
                          </p>
                        )}
                        {step.tool && (
                          <p className="text-gray-600 text-sm">
                            使用器具: {step.tool}
                          </p>
                        )}
                        <p className="text-gray-600 text-sm">
                          所要時間: {formatDuration(step.duration)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* プロセス図 */}
            {graph && (
              <div className="card">
                <h2 className="text-xl font-semibold text-blue-700 mb-3">プロセス図</h2>
                <div className="bg-gray-50 p-4 rounded-md overflow-auto border border-gray-200">
                  <Mermaid>{graph}</Mermaid>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}