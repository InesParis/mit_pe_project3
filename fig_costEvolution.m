% Compute theoretical prediction for cost evolution.
t_plot = unique( round( 10.^[0 : .05 : 7]' ) );
t0     = factorial(d+1) / (d^(d+2)) * n;
c_ave  = (t_plot/t0 + 1).^(-1/d);

figure(1)
clf
hold on
plot( time,   cost,  'bo')
plot( t_plot, c_ave, 'k-')
hold off
set(gca, 'XScale','log', 'YScale','log')
set(gca, 'FontSize',14)
set(gca, 'Box','on')
set(gca, 'YLim',10.^[-3 0], 'YTick',10.^[-4:0], 'XLim',10.^[0 8], 'XTick',10.^[0:8])
xlabel('# of Improvements Attempted')
ylabel('Cost')
title(['n = ',num2str(n),', d = ',num2str(d)])
