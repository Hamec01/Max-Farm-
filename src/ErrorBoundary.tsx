import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare readonly props: Readonly<Props>;
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  handleReset = () => {
    localStorage.removeItem("maxim_fermer_save");
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#FEF3C7] flex items-center justify-center p-6 font-sans">
          <div className="bg-white border-4 border-[#92400E] rounded-3xl p-8 max-w-md text-center shadow-xl">
            <span className="text-5xl">😢</span>
            <h1 className="text-xl font-black text-[#92400E] mt-3">Ой! Игра не загрузилась</h1>
            <p className="text-sm text-[#B45309] mt-2 font-bold">
              Возможно, старое сохранение повредилось. Нажми кнопку ниже — прогресс сбросится, но игра заработает.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-5 w-full py-3 px-6 bg-[#F59E0B] hover:bg-[#D97706] text-white font-black rounded-2xl border-4 border-[#92400E] cursor-pointer"
            >
              🔄 Сбросить и начать заново
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
